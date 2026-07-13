import type { ReactNode } from 'react';
import { InfoTip } from './Tooltip';

/** Readable on surface2 in light and dark mode (Tailwind dark: variant). */
export const TABLE_HEADER_TH_CLASS = 'text-slate-600 dark:text-slate-200';

export function SortableTh({
  label,
  sortKey,
  activeCol,
  sortArrow,
  onSort,
  sortable = true,
  className = '',
  tooltip,
  children,
}: {
  label?: string;
  sortKey?: string;
  activeCol?: string | null;
  sortArrow?: (col: string) => string;
  onSort?: (col: string) => void;
  sortable?: boolean;
  className?: string;
  tooltip?: string;
  children?: ReactNode;
}) {
  const headerContent = (
    <span className={`relative inline-block${tooltip ? ' pr-4' : ''}`}>
      {children ?? label}
      {tooltip ? (
        <span
          className="absolute top-0 right-0 inline-flex"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <InfoTip content={tooltip} label={`About ${label ?? sortKey ?? 'column'}`} />
        </span>
      ) : null}
    </span>
  );

  const tone = `${TABLE_HEADER_TH_CLASS} ${className}`.trim();

  if (!sortable || !sortKey || !onSort) {
    return (
      <th className={`px-4 py-3 font-semibold ${tone}`.trim()}>
        {headerContent}
      </th>
    );
  }

  return (
    <th
      className={`sortable-th ${activeCol === sortKey ? 'sorted' : ''} ${tone}`.trim()}
      onClick={() => onSort(sortKey)}
    >
      {headerContent}
      <span className="sort-arrow">{sortArrow?.(sortKey) ?? '▴'}</span>
    </th>
  );
}
