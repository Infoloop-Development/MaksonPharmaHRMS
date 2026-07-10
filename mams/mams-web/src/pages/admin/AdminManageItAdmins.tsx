import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { canManageOrgUsers, type ItAdminCreateResponse } from '@mams/types';
import { useAuth } from '../../store/auth';
import { itAdminsApi, IT_ADMINS_QUERY_KEY } from '../../api/itAdmins';
import { AdminSectionCard } from '../../components/ui/AdminSectionCard';
import { Badge } from '../../components/ui/Badge';
import { fmtIstDate } from '../../lib/format';
import { ItAdminSubNav } from '../../components/admin/itAdmin/ItAdminSubNav';
import { AddItAdminModal } from '../../components/admin/itAdmin/AddItAdminModal';
import { OneTimePasswordDialog } from '../../components/admin/itAdmin/OneTimePasswordDialog';

export function AdminManageItAdmins() {
  const user = useAuth((s) => s.user);
  const canAccess = canManageOrgUsers(user?.permissions ?? []);
  const qc = useQueryClient();

  const [openAdd, setOpenAdd] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<ItAdminCreateResponse | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: IT_ADMINS_QUERY_KEY,
    queryFn: itAdminsApi.list,
    enabled: canAccess,
  });

  if (!canAccess) return <Navigate to="/admin" replace />;

  const items = data?.items ?? [];

  const onCreated = (result: ItAdminCreateResponse) => {
    void qc.invalidateQueries({ queryKey: IT_ADMINS_QUERY_KEY });
    void qc.invalidateQueries({ queryKey: ['users'] });
    setCreatedAccount(result);
  };

  return (
    <div>
      <ItAdminSubNav />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Manage IT Admins</h1>
          <p className="text-sm text-text-muted mt-1">
            Create IT Admin accounts for bug reporting and operational access. New admins must change their password on first login.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setOpenAdd(true)}>
          Add IT Admin
        </button>
      </div>

      <AdminSectionCard title="IT Admin accounts">
        {isLoading && <p className="text-sm text-text-muted">Loading…</p>}
        {error && <p className="text-sm text-red">Failed to load IT Admin accounts.</p>}
        {!isLoading && !error && items.length === 0 && (
          <p className="text-sm text-text-muted">No IT Admin accounts yet.</p>
        )}
        {!isLoading && !error && items.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Date added</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3 pr-4 font-medium">{row.name}</td>
                      <td className="py-3 pr-4">{row.email}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={row.isActive ? 'green' : 'amber'}>
                          {row.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 text-text-muted">{fmtIstDate(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3">
              {items.map((row) => (
                <div key={row.id} className="card p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{row.name}</p>
                    <Badge tone={row.isActive ? 'green' : 'amber'}>
                      {row.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-muted break-all">{row.email}</p>
                  <p className="text-xs text-text-muted">Added {fmtIstDate(row.createdAt)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </AdminSectionCard>

      {openAdd && (
        <AddItAdminModal onClose={() => setOpenAdd(false)} onCreated={onCreated} />
      )}

      {createdAccount && (
        <OneTimePasswordDialog
          open
          email={createdAccount.email}
          password={createdAccount.initialPassword}
          onClose={() => setCreatedAccount(null)}
        />
      )}
    </div>
  );
}
