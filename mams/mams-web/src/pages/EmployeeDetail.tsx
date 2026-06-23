import { useState, useMemo } from 'react';
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
import { fmtDate, fmtHours } from '../lib/format';
import { attendanceApi } from '../api/attendance';
import { UnmaskPasswordModal } from '../components/employees/UnmaskPasswordModal';
import { isUnmaskEnabled } from '../config/featureFlags';
import { EmployeesAddModal } from './EmployeesAddModal';
import { EmployeeDeleteModal } from './EmployeeDeleteModal';
import { useTimeDisplay } from '../store/timeFormat';
import { Badge } from '../components/ui/Badge';

export function EmployeeDetail() {
  const { id } = useParams();
  const user = useAuth((s) => s.user);
  const unmaskFeatureOn = isUnmaskEnabled();
  const { fmtTime } = useTimeDisplay();
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

  const viewMode = user?.viewMode ?? 'real';
  const isCompliant = viewMode === 'compliant';

  const [days, setDays] = useState <7 | 14 | 30>(30);
  const todayStr = new Date().toISOString().slice(0,10);
  const startDateStr = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0,10);

  const { data: attData, isLoading: attLoading } = useQuery({
    queryKey: ['employee-attendance',id,days, viewMode],
    queryFn: () =>
      attendanceApi.list({employeeId: id!, startDate: startDateStr, endDate: todayStr, pageSize: 31}),
    enabled: !!id,
  });

  const attItems: any[] = attData?.items ?? []

  const summary = useMemo(() => {
    const present = attItems.filter((r) => r.status === 'Present' || r.status === 'Half Day').length;
    const absent = attItems.filter((r) => r.status === 'Absent').length;
    const weeklyOff = attItems.filter((r) => r.status === 'Weekly Off').length
    const totalNetHours = attItems.reduce((s,r) => s + (r.realNetHours ?? 0), 0);
    const totalOtHours = attItems.reduce((s,r) => s + (r.otHours ?? 0), 0);
    const totalCompliantHours = attItems.reduce((s,r) => s + (r.compliantHours ?? 0), 0);
    const equivDays = (isCompliant ? totalCompliantHours : totalNetHours) / 9.5;
    return { present, absent, weeklyOff, totalNetHours, totalOtHours, totalCompliantHours, equivDays}
  }, [attItems, isCompliant]);

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
          {!isCompliant && <Row label="Time Shift (real)" value={data.timeShift ?? '—'} />}
          <Row label={isCompliant ? "Shift" : "Compliance Shift"} value={data.alternateShift} />
          <Row label="Weekly Off" value={data.weeklyOff.join(', ')} />
          <Row label="Joined" value={fmtDate(data.joinDate.slice(0, 10))} />
          <Row label="Gender" value={data.gender} />
          <Row label="Status" value={data.status} />
        </Section>

        {!isCompliant && (
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
        )}
      </div>

      <div className="mt-4 card p-5">
        <div className = "flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className = "text-base font-bold">
            Attendance History{' '}
            <span className="font-normal text-xs text-text-muted">
              {isCompliant ? 'Compliant (8-hour) view' : 'Real (12-hour) view'}
            </span>
          </h2>
          <div className="flex gap-1 p-1 bg-surface2 rounded-lg">
            {([7,14,30] as const).map((d) => (
              <button
                key = {d}
                type = "button"
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-sm rounded-md transition ${
                  days === d
                    ? 'bg-white shadow-sm font-semibold text-text'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {d}d
              </button>

            ))}
          </div>
        </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {isCompliant ? (
          <SummaryTile label="Compliant Hours" value={attLoading ? '-': fmtHours(summary.totalCompliantHours)} />
        ) :(
          <>
            <SummaryTile label="Net Hours" value= {attLoading ? '-': fmtHours(summary.totalNetHours)} />
            <SummaryTile label="OT Hours" value= {attLoading ? '-': fmtHours(summary.totalOtHours)} />
          </>
        )}
      <SummaryTile label="Equiv. Days" value = {attLoading ? "-" : summary.equivDays.toFixed(1)} />
      <SummaryTile label="Present" value = {attLoading ? "-" : String(summary.present)} accent="green" />
      <SummaryTile label="Absent" value = {attLoading ? "-" : String(summary.absent)} accent="red" />
      <SummaryTile label="Weekly Off" value = {attLoading ? "-" : String(summary.weeklyOff)} />
      </div>

      {attLoading && <div className="text-sm text-text-muted py-6 text-center">Loading...</div>}
      {!attLoading && attItems.length === 0 && (
        <div className = "text-sm text-text-muted py-6 text-center">No records in this period.</div>
      )}
      {!attLoading && attItems.length > 0 && (
        <div className="tbl-scroll">
            <table className="w-full text-sm">
              <thead className="bg-surface2">
                <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Entry</th>
                  <th className="px-4 py-3 font-semibold">Exit</th>
                  <th className="px-4 py-3 font-semibold">{isCompliant ? 'Hours' : 'Net Hrs'}</th>
                  {!isCompliant && <th className="px-4 py-3 font-semibold">OT</th>}
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attItems.map((r: any) => {
                  const entry = isCompliant ? r.compliantEntryAt : r.realEntryAt;
                  const exit  = isCompliant ? r.compliantExitAt  : r.realExitAt;
                  const hrs   = isCompliant ? r.compliantHours   : r.realNetHours;
                  const tone  = r.status === 'Present'  ? 'green'
                              : r.status === 'Absent'   ? 'red'
                              : r.status === 'Half Day' ? 'amber'
                              : 'gray';
                  return (
                    <tr key={r.date} className="hover:bg-surface2/50">
                      <td className="px-4 py-2.5 font-mono text-xs">{fmtDate(r.date)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{entry ? fmtTime(entry) : '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{exit  ? fmtTime(exit)  : '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{typeof hrs === 'number' ? fmtHours(hrs) : '—'}</td>
                      {!isCompliant && (
                        <td className="px-4 py-2.5 font-mono text-xs">{r.otHours ? fmtHours(r.otHours) : '—'}</td>
                      )}
                      <td className="px-4 py-2.5">
                        <Badge tone={tone}>{r.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      )}
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

function SummaryTile({
  label,
  value,
  accent,
} : {
  label: string;
  value: string;
  accent?: 'green' | 'red';
}) {
  const bg =
    accent === 'green' ? 'bg-green-bg text-green-dark'
    : accent === 'red' ? 'bg-red-bg text-red'
    : 'bg-surface2 text-text';
  return (
    <div className={`p-3 rounded-lg ${bg}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}