import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPublic } from '@mams/types';

interface AuthState {
  user: UserPublic | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (auth: { user: UserPublic; accessToken: string; refreshToken: string }) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'mams-auth' }
  )
);
