import { useState, useEffect, Children, isValidElement } from 'react';
import { FilterIcon } from './FilterIcon';

function hasSheetFilters(children: React.ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (!child) return false;
    if (isValidElement(child)) {
      const cn = String(child.props?.className ?? '');
      if (/\bhidden\b/.test(cn) && /\bmd:/.test(cn)) return false;
    }
    return true;
  });
}

export function MobileFilterBar({
  activeCount = 0,
  onClear,
  search,
  children,
  actions,
  desktopClassName = 'hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3',
  noCard = false,
  className = '',
}: {
  activeCount?: number;
  onClear?: () => void;
  /** Always visible on mobile: never placed inside the filter sheet */
  search?: React.ReactNode;
  children?: React.ReactNode;
  /** Buttons shown beside filter trigger on mobile (e.g. Export, Add) */
  actions?: React.ReactNode;
  desktopClassName?: string;
  /** Skip outer card wrapper (when parent already provides one) */
  noCard?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const sheetFilters = hasSheetFilters(children);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const inner = (
    <>
      <div className="md:hidden filter-mobile-toolbar">
        {search && <div className="filter-search-outside">{search}</div>}
        {sheetFilters && (
          <button
            type="button"
            className="filter-trigger relative shrink-0"
            onClick={() => setOpen(true)}
            aria-label={`Filters${activeCount > 0 ? `, ${activeCount} active` : ''}`}
          >
            <FilterIcon />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            )}
            <span className="sr-only">Filters</span>
          </button>
        )}
        {actions && <div className="filter-mobile-actions">{actions}</div>}
      </div>

      <div className={desktopClassName}>
        {search}
        {children}
      </div>

      {open && sheetFilters && (
        <>
          <div className="filter-sheet-backdrop md:hidden" onClick={() => setOpen(false)} aria-hidden />
          <div className="filter-sheet md:hidden" role="dialog" aria-label="Filters">
            <div className="filter-sheet-header">
              <h3 className="font-semibold text-base">Filters</h3>
              <button type="button" className="filter-sheet-close" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="filter-sheet-body">{children}</div>
            <div className="filter-sheet-footer">
              {onClear && (
                <button type="button" className="btn-outline flex-1" onClick={() => { onClear(); setOpen(false); }}>
                  Clear all
                </button>
              )}
              <button type="button" className="btn-primary flex-1" onClick={() => setOpen(false)}>
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );

  if (noCard) {
    return <div className={className}>{inner}</div>;
  }
  return <div className={`card p-4 mb-4 ${className}`.trim()}>{inner}</div>;
}
