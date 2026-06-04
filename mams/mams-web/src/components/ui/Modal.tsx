import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const SIZE_MAP = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
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
        className={`bg-white rounded-lg shadow-floating w-full ${SIZE_MAP[size]} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white rounded-t-lg">
          <h2 className="text-base sm:text-lg font-bold pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-surface2 text-text-muted flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-4 sm:px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-4 sm:px-6 py-4 border-t border-border bg-surface2 rounded-b-lg flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sticky bottom-0 [&_.btn]:w-full sm:[&_.btn]:w-auto">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
