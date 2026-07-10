import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'board';
  footer?: React.ReactNode;
}

const SIZE_MAP = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  board: 'max-w-[80vw] w-[80vw]',
};

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className={`bg-surface rounded-lg shadow-floating w-full ${SIZE_MAP[size]} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-surface rounded-t-lg">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-surface2 text-text-muted flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="px-8 sm:px-10 py-8 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-4 sm:px-6 py-4 border-t border-border bg-surface2 rounded-b-lg flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sticky bottom-0 [&_.btn]:w-full sm:[&_.btn]:w-auto">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
