import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserPublic } from '@mams/types';

interface AuthState {
  user: UserPublic | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (auth: { user: UserPublic; accessToken: string; refreshToken: string }) => void;
  setUser: (user: UserPublic) => void;
  clear: () => void;
}

type PersistedAuth = Pick<AuthState, 'user' | 'accessToken' | 'refreshToken'>;

const AUTH_STORAGE_KEY = 'mams-auth';
const AUTH_PERSIST_VERSION = 1;

// One-time purge of the pre-fix localStorage copy of this key (auth now lives
// in sessionStorage only — see safeStorage below). Without this, an old token
// written before the sessionStorage migration would linger in localStorage
// indefinitely, unused but still readable.
try {
  localStorage.removeItem(AUTH_STORAGE_KEY);
} catch {
  /* ignore */
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function sanitizeUser(raw: unknown): UserPublic | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || typeof raw.email !== 'string' || typeof raw.role !== 'string') {
    return null;
  }
  return raw as UserPublic;
}

function sanitizePersistedState(raw: unknown): PersistedAuth | null {
  if (!isRecord(raw)) return null;
  const state = isRecord(raw.state) ? raw.state : raw;
  const user = state.user == null ? null : sanitizeUser(state.user);
  if (state.user != null && user == null) return null;
  const accessToken = typeof state.accessToken === 'string' ? state.accessToken : null;
  const refreshToken = typeof state.refreshToken === 'string' ? state.refreshToken : null;
  return { user, accessToken, refreshToken };
}

// sessionStorage, not localStorage: each browser tab must require its own
// explicit login. localStorage is shared across same-origin tabs, which let a
// refresh in one tab silently inherit another tab's (differently-privileged)
// session — a compliance-boundary violation for the dual-credential model.
const safeStorage = createJSONStorage<PersistedAuth>(() => ({
  getItem: (name) => {
    try {
      return sessionStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      sessionStorage.setItem(name, value);
    } catch {
      /* ignore quota / private mode */
    }
  },
  removeItem: (name) => {
    try {
      sessionStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
}));

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: AUTH_PERSIST_VERSION,
      storage: safeStorage,
      partialize: (state): PersistedAuth => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      migrate: (persisted, version) => {
        const clean = sanitizePersistedState(persisted);
        if (clean) return clean;
        if (version < AUTH_PERSIST_VERSION) {
          return { user: null, accessToken: null, refreshToken: null };
        }
        return persisted as PersistedAuth;
      },
      onRehydrateStorage: () => (state, err) => {
        if (err) {
          console.warn('[MAMS] Auth rehydration failed, clearing session:', err);
          try { sessionStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
          useAuth.setState({ user: null, accessToken: null, refreshToken: null });
          return;
        }
        if (!state) return;
        const clean = sanitizePersistedState({ state });
        if (!clean) {
          console.warn('[MAMS] Corrupt auth storage cleared');
          try { sessionStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
          useAuth.setState({ user: null, accessToken: null, refreshToken: null });
          return;
        }
        if (
          clean.user !== state.user ||
          clean.accessToken !== state.accessToken ||
          clean.refreshToken !== state.refreshToken
        ) {
          useAuth.setState(clean);
        }
      },
    }
  )
);
