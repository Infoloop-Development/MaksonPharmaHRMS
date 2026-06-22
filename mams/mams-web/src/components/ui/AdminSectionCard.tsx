import type { ReactNode } from 'react';

export function AdminSectionCard({
  title,
  children,
  footer,
  headerRight,
  className = '',
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  headerRight?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-5 h-full flex flex-col min-h-0 ${className}`.trim()}>
      <div className="flex items-center justify-between gap-2 mb-4 shrink-0">
        <h2 className="text-base font-bold">{title}</h2>
        {headerRight}
      </div>
      <div className="space-y-0 flex-1 min-h-0">{children}</div>
      {footer && (
        <div className="mt-4 pt-4 border-t border-border shrink-0">{footer}</div>
      )}
    </div>
  );
}
