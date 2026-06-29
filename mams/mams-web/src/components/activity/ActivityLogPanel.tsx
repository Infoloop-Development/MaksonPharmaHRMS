import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { activityApi, activityQueryKey, ACTIVITY_QUERY_PREFIX } from '../../api/activity';
import { useAuth } from '../../store/auth';
import { useTimeDisplay } from '../../store/timeFormat';
import { activityPageBadge } from '../../lib/activityLabels';
import { ActivityCardList } from './ActivityCardList';
import { ActivityDescription } from './ActivityDescription';
import { SortableTh } from '../ui/SortableTh';
import { TablePagination } from '../ui/TablePagination';
import { useTableSort } from '../../lib/tableSort';
import { tableColumnTooltip } from '../../lib/tooltips/tableColumnTooltips';

const PAGE_SIZE = 50;

export function ActivityLogPanel() {
  const { fmtDateTimeMs } = useTimeDisplay();
  const user = useAuth((s) => s.user);
  const userId = user?.id;
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [userId]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: activityQueryKey(userId, page),
    queryFn: () => activityApi.listMine({ page, pageSize: PAGE_SIZE }),
    enabled: !!userId,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });

  const getSortValue = useCallback((row: NonNullable<typeof data>['items'][number], col: string) => {
    if (col === 'occurredAt') return row.occurredAt;
    if (col === 'area') return activityPageBadge(row.eventType, row.payload);
    return '';
  }, []);
  const { sortCol, toggleSort, sortArrow, sortedRows } = useTableSort(data?.items ?? [], getSortValue, { occurredAt: 'date' });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <p className="text-sm text-text-muted">
          Your actions in MAMS (login, filters, edits). Timestamps are IST with milliseconds.
        </p>
        <button
          type="button"
          className="btn-outline btn-sm shrink-0 w-full sm:w-auto"
          onClick={refresh}
          disabled={isFetching}
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <ActivityCardList items={data?.items} isLoading={isLoading} />

      {isLoading && (
        <div className="hidden md:block text-sm text-text-muted py-6 text-center">Loading activity…</div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <div className="hidden md:block text-sm text-text-muted py-6 text-center">No activity recorded yet.</div>
      )}

      {!isLoading && data && data.items.length > 0 && (
        <div className="hidden md:block tbl-scroll max-h-[420px] border border-border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-surface2 sticky top-0">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <SortableTh label="Time (IST)" sortKey="occurredAt" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-3 py-2 w-[220px]" tooltip={tableColumnTooltip('audit', 'occurredAt')} />
                <SortableTh label="Area" sortKey="area" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-3 py-2 w-[100px]" tooltip={tableColumnTooltip('audit', 'area')} />
                <th className="px-3 py-2 font-semibold">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedRows.map((row) => (
                <tr key={row.id} className="hover:bg-surface2/40">
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{fmtDateTimeMs(row.occurredAt)}</td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-surface2 text-text-muted">
                      {activityPageBadge(row.eventType, row.payload)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text">
                    <ActivityDescription item={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <TablePagination
          page={page}
          totalPages={Math.ceil(data.total / PAGE_SIZE)}
          total={data.total}
          showTotal
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </div>
  );
}
