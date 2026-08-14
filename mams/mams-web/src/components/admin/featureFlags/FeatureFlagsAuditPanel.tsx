import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { activityApi, ORG_ACTIVITY_QUERY_PREFIX } from '../../../api/activity';
import { AdminSectionCard } from '../../ui/AdminSectionCard';
import { SortableTh } from '../../ui/SortableTh';
import { useTableSort } from '../../../lib/tableSort';
import { tableColumnTooltip } from '../../../lib/tooltips/tableColumnTooltips';

type AuditRow = {
  id: string;
  eventType: string;
  userName?: string | null;
  occurredAt: string;
  payload?: Record<string, unknown>;
};

export function FeatureFlagsAuditPanel() {
  const { data, isLoading } = useQuery({
    queryKey: [...ORG_ACTIVITY_QUERY_PREFIX, 'feature-flags', 1],
    queryFn: () =>
      activityApi.listOrg({
        page: 1,
        pageSize: 10,
        eventType: 'feature_flags_changed',
      }),
  });

  const settingsQ = useQuery({
    queryKey: [...ORG_ACTIVITY_QUERY_PREFIX, 'settings-flags', 1],
    queryFn: () =>
      activityApi.listOrg({
        page: 1,
        pageSize: 5,
        eventType: 'settings_changed',
      }),
  });

  const rows: AuditRow[] = [
    ...(data?.items ?? []),
    ...(settingsQ.data?.items ?? []).filter((item) => {
      const fields = (item.payload?.changedFields as string[] | undefined) ?? [];
      return fields.some((f) => f === 'smartAnchorEnabled' || f === 'confidentialityNoticeEnabled');
    }),
  ]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 10);

  const getSortValue = useCallback((row: AuditRow, col: string) => {
    if (col === 'event') return row.eventType === 'feature_flags_changed' ? 'Feature flag' : 'Settings';
    if (col === 'user') return row.userName ?? 'System';
    if (col === 'occurredAt') return row.occurredAt;
    return '';
  }, []);

  const { sortCol, toggleSort, sortArrow, sortedRows } = useTableSort(rows, getSortValue, { occurredAt: 'date' });

  return (
    <AdminSectionCard title="Recent changes">
      <p className="text-xs text-text-muted mb-4 -mt-1">
        Feature flag and linked settings updates from the audit log.
      </p>
      {isLoading && <div className="text-text-muted text-sm">Loading…</div>}
      {!isLoading && sortedRows.length === 0 && (
        <div className="text-sm text-text-muted">No recent flag changes recorded.</div>
      )}
      {sortedRows.length > 0 && (
        <>
          <div className="space-y-2 md:hidden">
            {sortedRows.map((row) => (
              <div key={row.id} className="rounded-lg border border-border p-3">
                <div className="font-medium text-sm">
                  {row.eventType === 'feature_flags_changed' ? 'Feature flag' : 'Settings'}
                </div>
                <div className="text-xs text-text-muted mt-1">{row.userName ?? 'System'}</div>
                <div className="text-xs text-text-muted mt-0.5">
                  {new Date(row.occurredAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div className="tbl-scroll -mx-1 hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                  <SortableTh label="Event" sortKey="event" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="py-2 px-1" tooltip={tableColumnTooltip('audit', 'event')} />
                  <SortableTh label="User" sortKey="user" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="py-2 px-1" tooltip={tableColumnTooltip('audit', 'user')} />
                  <SortableTh label="When" sortKey="occurredAt" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="py-2 px-1 text-right" tooltip={tableColumnTooltip('audit', 'occurredAt')} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 px-1 font-medium">
                      {row.eventType === 'feature_flags_changed' ? 'Feature flag' : 'Settings'}
                    </td>
                    <td className="py-2 px-1 text-text-muted">{row.userName ?? 'System'}</td>
                    <td className="py-2 px-1 text-right text-xs text-text-muted whitespace-nowrap">
                      {new Date(row.occurredAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminSectionCard>
  );
}
