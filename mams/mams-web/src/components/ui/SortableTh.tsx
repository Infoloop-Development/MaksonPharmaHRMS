import type { ReactNode } from 'react';
import { InfoTip } from './Tooltip';

export function SortableTh({
  label,
  sortKey,
  activeCol,
  sortArrow,
  onSort,
  sortable = true,
  className = '',
  children,
  tooltip,
}: {
  label?: string;
  sortKey?: string;
  activeCol?: string | null;
  sortArrow?: (col: string) => string;
  onSort?: (col: string) => void;
  sortable?: boolean;
  className?: string;
  children?: ReactNode;
  tooltip?: string;
}) {
  const headerContent = (
    <>
      <span>{children ?? label}</span>
      {tooltip ? (
        <span
          className="inline-flex align-middle"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <InfoTip content={tooltip} label={`About ${label ?? sortKey ?? 'column'}`} />
        </span>
      ) : null}
    </>
  );

  if (!sortable || !sortKey || !onSort) {
    return (
      <th className={`px-4 py-3 font-semibold ${className}`.trim()}>
        {headerContent}
      </th>
    );
  }

  return (
    <th
      className={`sortable-th ${activeCol === sortKey ? 'sorted' : ''} ${className}`.trim()}
      onClick={() => onSort(sortKey)}
    >
      {headerContent}
      <span className="sort-arrow">{sortArrow?.(sortKey) ?? '▴'}</span>
    </th>
  );
}
