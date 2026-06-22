import { useQuery } from '@tanstack/react-query';
import { activityApi, ORG_ACTIVITY_QUERY_PREFIX } from '../../../api/activity';
import { AdminSectionCard } from '../../ui/AdminSectionCard';

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

  const rows = [
    ...(data?.items ?? []),
    ...(settingsQ.data?.items ?? []).filter((item) => {
      const fields = (item.payload?.changedFields as string[] | undefined) ?? [];
      return fields.some((f) => f === 'smartAnchorEnabled' || f === 'confidentialityNoticeEnabled');
    }),
  ]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 10);

  return (
    <AdminSectionCard title="Recent changes">
      <p className="text-xs text-text-muted mb-4 -mt-1">
        Feature flag and linked settings updates from the audit log.
      </p>
      {isLoading && <div className="text-text-muted text-sm">Loading…</div>}
      {!isLoading && rows.length === 0 && (
        <div className="text-sm text-text-muted">No recent flag changes recorded.</div>
      )}
      {rows.length > 0 && (
        <div className="tbl-scroll -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="py-2 px-1">Event</th>
                <th className="py-2 px-1">User</th>
                <th className="py-2 px-1 text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
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
      )}
    </AdminSectionCard>
  );
}
