import type { ActivityListItem, AuditLogCategory } from '@mams/types';
import { AUDIT_LOG_CATEGORIES, ROLE_LABELS, type Role } from '@mams/types';
import { useCallback } from 'react';
import { EMPTY_CELL, fmtIstDateTimeMs } from '../../lib/format';
import { activityPageBadge } from '../../lib/activityLabels';
import { ActivityDescription } from './ActivityDescription';
import { SortableTh } from '../ui/SortableTh';
import { useTableSort } from '../../lib/tableSort';
import { tableColumnTooltip } from '../../lib/tooltips/tableColumnTooltips';

type ActiveFilters = {
  category: AuditLogCategory;
  userId: string;
  userName?: string;
  role: string;
  search: string;
};

export function AuditLogActiveFilters({
  filters,
  onClearUser,
  onClearRole,
  onClearSearch,
  onClearCategory,
}: {
  filters: ActiveFilters;
  onClearUser: () => void;
  onClearRole: () => void;
  onClearSearch: () => void;
  onClearCategory: () => void;
}) {
  const categoryLabel = AUDIT_LOG_CATEGORIES.find((c) => c.id === filters.category)?.label;
  const hasCategory = filters.category !== 'all';
  const hasUser = Boolean(filters.userId);
  const hasRole = Boolean(filters.role);
  const hasSearch = Boolean(filters.search.trim());

  if (!hasCategory && !hasUser && !hasRole && !hasSearch) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
      <span className="text-text-muted font-semibold uppercase tracking-wide">Filters</span>
      {hasCategory && categoryLabel && (
        <button type="button" className="dash-filter-tag" onClick={onClearCategory}>
          {categoryLabel} ×
        </button>
      )}
      {hasUser && (
        <button type="button" className="dash-filter-tag" onClick={onClearUser}>
          User: {filters.userName ?? 'Selected'} ×
        </button>
      )}
      {hasRole && (
        <button type="button" className="dash-filter-tag" onClick={onClearRole}>
          Role: {ROLE_LABELS[filters.role as Role] ?? filters.role} ×
        </button>
      )}
      {hasSearch && (
        <button type="button" className="dash-filter-tag" onClick={onClearSearch}>
          Search: {filters.search.trim()} ×
        </button>
      )}
    </div>
  );
}

export function AuditLogResults({
  items,
  isLoading,
  error,
}: {
  items: ActivityListItem[] | undefined;
  isLoading: boolean;
  error?: unknown;
}) {
  const getSortValue = useCallback((row: ActivityListItem, col: string) => {
    if (col === 'occurredAt') return row.occurredAt;
    if (col === 'user') return row.userName ?? '';
    if (col === 'eventType') return activityPageBadge(row.eventType, row.payload);
    return '';
  }, []);

  const { sortCol, toggleSort, sortArrow, sortedRows } = useTableSort(
    items ?? [],
    getSortValue,
    { occurredAt: 'date' }
  );

  if (isLoading) {
    return <div className="text-sm text-text-muted py-6 text-center">Loading audit…</div>;
  }

  if (error) {
    return <div className="text-sm text-red py-6 text-center">Failed to load.</div>;
  }

  if (!sortedRows.length) {
    return <div className="text-sm text-text-muted py-6 text-center">No matching events.</div>;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {sortedRows.map((row) => (
          <div key={row.id} className="border border-border rounded-lg p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs text-text-muted">{fmtIstDateTimeMs(row.occurredAt)}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface2">
                {activityPageBadge(row.eventType, row.payload)}
              </span>
              {row.userName && (
                <span className="text-xs text-text-muted">
                  {row.userName} · {row.userRole}
                </span>
              )}
            </div>
            <ActivityDescription item={row} />
          </div>
        ))}
      </div>

      <div className="hidden md:block tbl-scroll max-h-[560px] border border-border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-surface2 sticky top-0">
            <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
              <SortableTh label="Time" sortKey="occurredAt" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-3 py-2 w-[200px]" tooltip={tableColumnTooltip('audit', 'occurredAt')} />
              <SortableTh label="Area" sortKey="eventType" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-3 py-2 w-[100px]" tooltip={tableColumnTooltip('audit', 'eventType')} />
              <SortableTh label="User" sortKey="user" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-3 py-2 w-[180px]" tooltip={tableColumnTooltip('audit', 'user')} />
              <th className="px-3 py-2 font-semibold">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedRows.map((row) => (
              <tr key={row.id} className="hover:bg-surface2/40 align-top">
                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{fmtIstDateTimeMs(row.occurredAt)}</td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-surface2 text-text-muted">
                    {activityPageBadge(row.eventType, row.payload)}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-text-muted">
                  {row.userName ? (
                    <>
                      <div className="font-medium text-text">{row.userName}</div>
                      <div>{row.userRole}</div>
                    </>
                  ) : (
                    EMPTY_CELL
                  )}
                </td>
                <td className="px-3 py-2 text-text">
                  <ActivityDescription item={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
