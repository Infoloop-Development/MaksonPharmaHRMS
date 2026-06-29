import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ALL_SENSITIVE_UNMASK_FIELDS,
  SENSITIVE_UNMASK_FIELD_LABELS,
  type SensitiveUnmaskField,
} from '@mams/types';
import { employeesApi } from '../api/employees';
import { ApiError } from '../api/client';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';
import { useAuth } from '../store/auth';
import { EMPTY_CELL, fmtDate } from '../lib/format';
import { UnmaskPasswordModal } from '../components/employees/UnmaskPasswordModal';
import { isUnmaskEnabled } from '../config/featureFlags';
import { EmployeesAddModal } from './EmployeesAddModal';
import { EmployeeDeleteModal } from './EmployeeDeleteModal';

export function EmployeeDetail() {
  const { id } = useParams();
  const user = useAuth((s) => s.user);
  const unmaskFeatureOn = isUnmaskEnabled();
  const [unmasked, setUnmasked] = useState<Partial<Record<SensitiveUnmaskField, string>>>({});
  const [pendingField, setPendingField] = useState<SensitiveUnmaskField | null>(null);
  const [unmaskLoading, setUnmaskLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const qc = useQueryClient();

  const canManage =
    user?.permissions.includes('manage.employees') || user?.permissions.includes('manage.users') || false;

  const grants = user?.unmaskFieldGrants ?? [];
  const hasLegacyUnmask =
    (user?.permissions?.includes('unmask.sensitive') ?? false) && grants.length === 0;
  const effectiveGrants: SensitiveUnmaskField[] = hasLegacyUnmask
    ? [...ALL_SENSITIVE_UNMASK_FIELDS]
    : grants;

  const canUnmaskField = (field: SensitiveUnmaskField) =>
    unmaskFeatureOn && effectiveGrants.includes(field);

  const { data, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getOne(id!),
    enabled: !!id,
  });

  const handleUnmaskConfirm = async (password: string, reason?: string) => {
    if (!id || !pendingField) return;
    setPasswordError(null);
    setUnmaskLoading(true);
    try {
      const res = await employeesApi.unmask(id, pendingField, { password, reason });
      setUnmasked((u) => ({ ...u, [pendingField]: res.value }));
      setPendingField(null);
      setPasswordError(null);
      void qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
    } catch (e: unknown) {
      void qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
      if (e instanceof ApiError) {
        if (e.code === 'invalid_credentials') {
          setPasswordError('Incorrect password. Please try again.');
          return;
        }
        setPasswordError(e.message || 'Unmask failed');
        return;
      }
      setPasswordError('Unmask failed. Please try again.');
    } finally {
      setUnmaskLoading(false);
    }
  };

  if (isLoading) return <div className="text-text-muted">Loading...</div>;
  if (error || !data) return <div className="text-red">Failed to load employee.</div>;

  return (
    <div>
      <div className="mb-4">
        <Link to="/employees" className="text-sm text-link hover:underline">
          {'←'} Back to employees
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <div className="text-sm text-text-muted font-mono">
            {data.empCode} · {data.biometricId}
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline" onClick={() => setEditOpen(true)}>
              Edit
            </button>
            <button type="button" className="btn-outline text-red" onClick={() => setDeleteOpen(true)}>
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Profile">
          <Row label="Department" value={data.department} />
          <Row label="Designation" value={data.designation} />
          <Row label="Location" value={data.location} />
          <Row label="Time Shift (real)" value={data.timeShift ?? EMPTY_CELL} />
          <Row label="Compliance Shift" value={data.alternateShift} />
          <Row label="Weekly Off" value={data.weeklyOff.join(', ')} />
          <Row label="Joined" value={fmtDate(data.joinDate.slice(0, 10))} />
          <Row label="Gender" value={data.gender} />
          <Row label="Status" value={data.status} />
        </Section>

        <Section title="Sensitive (masked by default)">
          {unmaskFeatureOn && (
            <div className="text-xs text-text-muted mb-3 leading-relaxed">
              Unmask is only shown for fields your account is allowed to reveal. Enter your login password
              in the dialog to confirm; every reveal is audit-logged.
            </div>
          )}
          {ALL_SENSITIVE_UNMASK_FIELDS.map((f) => (
            <SensitiveRow
              key={f}
              label={SENSITIVE_UNMASK_FIELD_LABELS[f]}
              value={unmasked[f] ?? String((data as Record<string, unknown>)[f] ?? '')}
              showUnmask={canUnmaskField(f) && !unmasked[f]}
              onUnmask={() => {
                setPasswordError(null);
                setPendingField(f);
              }}
            />
          ))}
        </Section>
      </div>

      {unmaskFeatureOn && pendingField !== null && (
        <UnmaskPasswordModal
          field={pendingField}
          open
          onClose={() => !unmaskLoading && setPendingField(null)}
          onConfirm={handleUnmaskConfirm}
          loading={unmaskLoading}
          passwordError={passwordError}
          onClearPasswordError={() => setPasswordError(null)}
        />
      )}

      {editOpen && (
        <EmployeesAddModal mode="edit" employee={data} onClose={() => setEditOpen(false)} />
      )}
      {deleteOpen && (
        <EmployeeDeleteModal employee={data} onClose={() => setDeleteOpen(false)} redirectOnSuccess />
      )}
    </div>
  );
}

function SensitiveRow({
  label,
  value,
  showUnmask,
  onUnmask,
}: {
  label: string;
  value: string;
  showUnmask: boolean;
  onUnmask: () => void;
}) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0 gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-text-subtle">{label}</div>
        <div className="font-mono text-sm break-all">{value}</div>
      </div>
      {showUnmask && (
        <button type="button" onClick={onUnmask} className="btn-outline text-xs shrink-0">
          Unmask
        </button>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-base font-bold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 text-sm gap-4">
      <span className="text-text-muted shrink-0">{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  );
}
