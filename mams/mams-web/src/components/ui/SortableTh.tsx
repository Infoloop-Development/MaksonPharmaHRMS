import type { ReactNode } from 'react';

export function SortableTh({
  label,
  sortKey,
  activeCol,
  sortArrow,
  onSort,
  sortable = true,
  className = '',
  children,
}: {
  label?: string;
  sortKey?: string;
  activeCol?: string | null;
  sortArrow?: (col: string) => string;
  onSort?: (col: string) => void;
  sortable?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  if (!sortable || !sortKey || !onSort) {
    return (
      <th className={`px-4 py-3 font-semibold ${className}`.trim()}>
        {children ?? label}
      </th>
    );
  }

  return (
    <th
      className={`sortable-th ${activeCol === sortKey ? 'sorted' : ''} ${className}`.trim()}
      onClick={() => onSort(sortKey)}
    >
      {children ?? label}
      <span className="sort-arrow">{sortArrow?.(sortKey) ?? '▴'}</span>
    </th>
  );
}
