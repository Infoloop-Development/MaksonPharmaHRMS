import type { ReactNode } from 'react';
import { SortableTh } from './SortableTh';
import type { SortColumnType } from '../../lib/tableSort';

export interface DataTableColumn<T> {
  id: string;
  label: string;
  sortable?: boolean;
  type?: SortColumnType;
  className?: string;
  headerClassName?: string;
  tooltip?: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyMessage = 'No records found.',
  sortCol,
  sortArrow,
  onSort,
  mobileCards,
  footer,
  scrollClassName = 'tbl-scroll',
  tableClassName = 'w-full text-sm',
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  sortCol?: string | null;
  sortArrow?: (col: string) => string;
  onSort?: (col: string) => void;
  mobileCards?: ReactNode;
  footer?: ReactNode;
  scrollClassName?: string;
  tableClassName?: string;
}) {
  return (
    <>
      {mobileCards}
      <div className={`card overflow-hidden hidden md:block`}>
        <div className={scrollClassName}>
          <table className={tableClassName}>
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                {columns.map((col) => (
                  <SortableTh
                    key={col.id}
                    label={col.label}
                    sortKey={col.id}
                    activeCol={sortCol}
                    sortArrow={sortArrow}
                    onSort={onSort}
                    sortable={col.sortable !== false && Boolean(onSort)}
                    tooltip={col.tooltip}
                    className={col.headerClassName ?? col.className ?? ''}
                  />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-text-muted">
                    {emptyMessage}
                  </td>
                </tr>
              )}
              {!isLoading &&
                rows.map((row) => (
                  <tr key={rowKey(row)} className="hover:bg-surface2/50">
                    {columns.map((col) => (
                      <td key={col.id} className={`px-4 py-2.5 ${col.className ?? ''}`.trim()}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {footer}
      </div>
    </>
  );
}
