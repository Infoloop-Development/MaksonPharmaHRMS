import { create } from 'zustand';
import { useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { hasMobileBottomNav } from '../../lib/mobileBottomNav';

interface ToastState {
  toasts: Array<{ id: number; message: string; tone: 'success' | 'error' | 'info' }>;
  push: (message: string, tone?: 'success' | 'error' | 'info') => void;
  remove: (id: number) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = Date.now() + Math.random();
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const TONE_STYLES = {
  success: 'bg-green text-white',
  error: 'bg-red text-white',
  info: 'bg-primary text-white',
};

export function ToastContainer() {
  const toasts = useToast((s) => s.toasts);
  const user = useAuth((s) => s.user);
  const aboveBottomNav = hasMobileBottomNav(user?.role);

  return (
    <div
      className={`fixed left-4 right-4 sm:left-auto sm:right-4 z-[100] flex flex-col gap-2 items-stretch sm:items-end ${
        aboveBottomNav
          ? 'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-4'
          : 'bottom-4'
      }`}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-md shadow-floating text-sm font-medium w-full sm:min-w-[240px] sm:max-w-[400px] ${TONE_STYLES[t.tone]} animate-[fadeIn_0.2s_ease-out]`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// Optional hook to ensure container mounts only once.
export function useToastSetup() {
  // No-op for now; reserved for future setup.
  useEffect(() => {}, []);
}
