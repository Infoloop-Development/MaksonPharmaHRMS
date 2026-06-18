import type { ThemePreference } from '@mams/types';

export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'mams-theme';

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemPrefersDark() ? 'dark' : 'light';
}

export function applyThemeClass(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
}

export function readCachedThemePreference(): ThemePreference | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return null;
}

export function cacheThemePreference(preference: ThemePreference): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, preference);
}

/** Bootstrap theme before React hydrates (see index.html inline script). */
export function bootstrapThemeFromCache(): void {
  const cached = readCachedThemePreference();
  if (!cached) return;
  applyThemeClass(resolveTheme(cached));
}
