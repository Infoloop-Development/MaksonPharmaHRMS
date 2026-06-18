import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ThemePreference } from '@mams/types';
import { authApi } from '../api/auth';
import { useAuth } from './auth';
import {
  applyThemeClass,
  cacheThemePreference,
  readCachedThemePreference,
  resolveTheme,
  type ResolvedTheme,
} from '../lib/theme';

type ThemeContextValue = {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  busy: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(
    () => user?.themePreference ?? readCachedThemePreference() ?? 'system'
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.themePreference) {
      setThemePreferenceState(user.themePreference);
      cacheThemePreference(user.themePreference);
    }
  }, [user?.themePreference]);

  const resolvedTheme = useMemo(() => resolveTheme(themePreference), [themePreference]);

  useEffect(() => {
    applyThemeClass(resolvedTheme);
    cacheThemePreference(themePreference);
  }, [resolvedTheme, themePreference]);

  useEffect(() => {
    if (themePreference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeClass(resolveTheme('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themePreference]);

  const setThemePreference = useCallback(
    async (preference: ThemePreference) => {
      setThemePreferenceState(preference);
      applyThemeClass(resolveTheme(preference));
      cacheThemePreference(preference);
      if (!user) return;
      setBusy(true);
      try {
        const { user: updated } = await authApi.updatePreferences({ themePreference: preference });
        setUser(updated);
      } finally {
        setBusy(false);
      }
    },
    [setUser, user]
  );

  const value = useMemo(
    () => ({ themePreference, resolvedTheme, setThemePreference, busy }),
    [themePreference, resolvedTheme, setThemePreference, busy]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
