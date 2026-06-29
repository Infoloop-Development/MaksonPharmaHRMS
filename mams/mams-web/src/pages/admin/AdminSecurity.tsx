import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, type UserSummary } from '../../api/users';
import { useToast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../store/auth';
import { SortableTh } from '../../components/ui/SortableTh';
import { useTableSort } from '../../lib/tableSort';
import { tableColumnTooltip } from '../../lib/tooltips/tableColumnTooltips';

export function AdminSecurity() {
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const [revokeTarget, setRevokeTarget] = useState<UserSummary | null>(null);
  const canManageSecurity = useAuth((s) =>
    s.user?.permissions.includes('manage.security') || s.user?.permissions.includes('manage.org_users')
  );

  const items = data?.items ?? [];
  const getSortValue = useCallback((row: UserSummary, col: string) => {
    if (col === 'user') return row.name;
    if (col === 'role') return row.role;
    if (col === 'lastLogin') return row.lastLoginAt ?? '';
    return '';
  }, []);
  const { sortCol, toggleSort, sortArrow, sortedRows } = useTableSort(items, getSortValue, { lastLogin: 'date' });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Security & sessions</h1>
        <p className="text-sm text-text-muted mt-1">
          Revoke refresh sessions to sign a user out everywhere. Force password reset on next login via user edit.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-4">Active accounts</h2>
        {isLoading && <div className="text-text-muted text-sm">Loading users…</div>}
        <div className="tbl-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <SortableTh label="User" sortKey="user" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="py-2" tooltip={tableColumnTooltip('settings', 'user')} />
                <SortableTh label="Role" sortKey="role" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="py-2" tooltip={tableColumnTooltip('settings', 'role')} />
                <SortableTh label="Last login" sortKey="lastLogin" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="py-2" tooltip={tableColumnTooltip('settings', 'lastLogin')} />
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedRows.map((u) => (
                <tr key={u._id}>
                  <td className="py-2">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-text-muted">{u.email}</div>
                  </td>
                  <td className="py-2"><Badge tone="blue">{u.role}</Badge></td>
                  <td className="py-2 text-xs text-text-muted">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-2 text-right">
                    {canManageSecurity && u.isActive && (
                      <button type="button" className="btn-outline btn-sm" onClick={() => setRevokeTarget(u)}>
                        Revoke sessions
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {revokeTarget && (
        <RevokeSessionsModal user={revokeTarget} onClose={() => setRevokeTarget(null)} />
      )}
    </div>
  );
}

function RevokeSessionsModal({ user, onClose }: { user: UserSummary; onClose: () => void }) {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => usersApi.revokeSessions(user._id),
    onSuccess: () => {
      toast(`Sessions revoked for ${user.email}`, 'success');
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e: unknown) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Revoke all sessions"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Revoking…' : 'Revoke sessions'}
          </button>
        </>
      }
    >
      <p className="text-sm text-text-muted">
        This will invalidate all refresh tokens for <strong>{user.name}</strong> ({user.email}). They must sign in again on every device.
      </p>
    </Modal>
  );
}
