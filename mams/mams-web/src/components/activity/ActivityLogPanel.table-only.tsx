/**
 * Table-only Activity log panel (branch 1: feature/activity-log).
 * Branch 2 replaces ActivityLogPanel.tsx with the hybrid card + table version.
 */
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { activityApi, activityQueryKey, ACTIVITY_QUERY_PREFIX } from '../../api/activity';
import { useAuth } from '../../store/auth';
import { useTimeDisplay } from '../../store/timeFormat';
import { activityPageBadge, formatActivityDescription } from '../../lib/activityLabels';

const PAGE_SIZE = 50;

export function ActivityLogPanel() {
  const { fmtDateTimeMs } = useTimeDisplay();
  const userId = useAuth((s) => s.user?.id);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-sm text-text-muted">
          Your actions in MAMS (login, filters, edits). Timestamps are IST with milliseconds.
        </p>
        <button
          type="button"
          className="btn-outline text-xs shrink-0"
          onClick={refresh}
          disabled={isFetching}
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="tbl-scroll max-h-[420px] border border-border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-surface2 sticky top-0">
            <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-3 py-2 font-semibold w-[220px]">Time (IST)</th>
              <th className="px-3 py-2 font-semibold w-[100px]">Area</th>
              <th className="px-3 py-2 font-semibold">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-3 py-10 text-center text-text-muted">
                  Loading activity…
                </td>
              </tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-10 text-center text-text-muted">
                  No activity recorded yet.
                </td>
              </tr>
            )}
            {data?.items.map((row) => (
              <tr key={row.id} className="hover:bg-surface2/40">
                <td className="px-3 py-2 text-xs tabular-nums whitespace-nowrap">{fmtDateTimeMs(row.occurredAt)}</td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-surface2 text-text-muted">
                    {activityPageBadge(row.eventType, row.payload)}
                  </span>
                </td>
                <td className="px-3 py-2 text-text !whitespace-normal break-words">{formatActivityDescription(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-text-muted">
            Page {page} of {Math.ceil(data.total / PAGE_SIZE)} ({data.total} total)
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn-outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button
              type="button"
              className="btn-outline"
              disabled={page * PAGE_SIZE >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
