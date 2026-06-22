import type { ReactNode } from 'react';

export function DashboardDataTableShell({
  title,
  subtitle,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  toolbar,
  isLoading,
  error,
  isEmpty,
  emptyMessage = 'No records found.',
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  isLoading?: boolean;
  error?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="card p-4 md:p-5 overflow-hidden" data-tour-id="dashboard-attendance-table">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto lg:min-w-[280px]">
          {onSearchChange && (
            <input
              type="search"
              className="w-full"
              placeholder={searchPlaceholder}
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search table"
            />
          )}
          {toolbar}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-muted py-8 text-center">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red py-8 text-center">Failed to load table data.</p>
      ) : isEmpty ? (
        <p className="text-sm text-text-muted py-8 text-center">{emptyMessage}</p>
      ) : (
        children
      )}

      {footer && <div className="mt-4 pt-3 border-t border-border">{footer}</div>}
    </div>
  );
}

export function TablePaginationFooter({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={onPrev}>
        Previous
      </button>
      <span className="text-text-muted">
        Page {page} of {totalPages} · {total} records
      </span>
      <button type="button" className="btn-outline btn-sm" disabled={page >= totalPages} onClick={onNext}>
        Next
      </button>
    </div>
  );
}
