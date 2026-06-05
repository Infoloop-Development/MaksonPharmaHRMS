import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { activityApi, ACTIVITY_QUERY_KEY } from '../../api/activity';
import { fmtIstDateTimeMs } from '../../lib/format';
import { activityPageBadge, formatActivityDescription } from '../../lib/activityLabels';
import { ActivityCardList } from './ActivityCardList';

const PAGE_SIZE = 50;

export function ActivityLogPanel() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...ACTIVITY_QUERY_KEY, page],
    queryFn: () => activityApi.listMine({ page, pageSize: PAGE_SIZE }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEY });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <p className="text-sm text-text-muted">
          Your actions in MAMS (login, filters, edits). Timestamps are IST with milliseconds.
        </p>
        <button
          type="button"
          className="btn-outline text-xs shrink-0 w-full sm:w-auto"
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
                <th className="px-3 py-2 font-semibold w-[220px]">Time (IST)</th>
                <th className="px-3 py-2 font-semibold w-[100px]">Area</th>
                <th className="px-3 py-2 font-semibold">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((row) => (
                <tr key={row.id} className="hover:bg-surface2/40">
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{fmtIstDateTimeMs(row.occurredAt)}</td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-surface2 text-text-muted">
                      {activityPageBadge(row.eventType, row.payload)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text">{formatActivityDescription(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
          <span className="text-text-muted">
            Page {page} of {Math.ceil(data.total / PAGE_SIZE)} ({data.total} total)
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              className="btn-outline flex-1 sm:flex-none"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-outline flex-1 sm:flex-none"
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
