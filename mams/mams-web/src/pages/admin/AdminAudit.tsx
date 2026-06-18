import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityApi, ORG_ACTIVITY_QUERY_PREFIX } from '../../api/activity';
import { usersApi } from '../../api/users';
import { ActivityDescription } from '../../components/activity/ActivityDescription';
import { activityPageBadge } from '../../lib/activityLabels';
import type { Role } from '@mams/types';
import { ROLE_LABELS } from '@mams/types';

const PAGE_SIZE = 50;

export function AdminAudit() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');
  const [eventType, setEventType] = useState('');

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const { data, isLoading } = useQuery({
    queryKey: [...ORG_ACTIVITY_QUERY_PREFIX, page, userId, role, eventType],
    queryFn: () =>
      activityApi.listOrg({
        page,
        pageSize: PAGE_SIZE,
        userId: userId || undefined,
        role: role || undefined,
        eventType: eventType || undefined,
      }),
  });

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportCsv = () => {
    if (!data?.items.length) return;
    const header = ['occurredAt', 'eventType', 'userName', 'userEmail', 'userRole', 'entityType', 'entityId'];
    const rows = data.items.map((r) =>
      [
        r.occurredAt,
        r.eventType,
        r.userName ?? '',
        r.userEmail ?? '',
        r.userRole ?? '',
        r.entityType ?? '',
        r.entityId ?? '',
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-audit-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Audit log</h1>
          <p className="text-sm text-text-muted mt-1">Organization-wide activity across all users.</p>
        </div>
        <button type="button" className="btn-outline btn-sm" onClick={exportCsv} disabled={!data?.items.length}>
          Export page CSV
        </button>
      </div>

      <div className="card p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="label block mb-1">User</span>
          <select className="input" value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }}>
            <option value="">All users</option>
            {users?.items.map((u) => (
              <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label block mb-1">Role</span>
          <select className="input" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">All roles</option>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label block mb-1">Event type</span>
          <input className="input" value={eventType} placeholder="e.g. user_created" onChange={(e) => { setEventType(e.target.value); setPage(1); }} />
        </label>
      </div>

      <div className="card p-4">
        {isLoading && <div className="text-sm text-text-muted py-6 text-center">Loading audit…</div>}
        {!isLoading && !data?.items.length && (
          <div className="text-sm text-text-muted py-6 text-center">No matching events.</div>
        )}
        <div className="space-y-3">
          {data?.items.map((row) => (
            <div key={row.id} className="border border-border rounded-lg p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs text-text-muted">{new Date(row.occurredAt).toLocaleString()}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface2">{activityPageBadge(row.eventType, row.payload)}</span>
                {row.userName && (
                  <span className="text-xs text-text-muted">{row.userName} · {row.userRole}</span>
                )}
              </div>
              <ActivityDescription item={row} />
            </div>
          ))}
        </div>
        {total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-text-muted">Page {page} of {pageCount} ({total} events)</span>
            <div className="flex gap-2">
              <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button type="button" className="btn-outline btn-sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
