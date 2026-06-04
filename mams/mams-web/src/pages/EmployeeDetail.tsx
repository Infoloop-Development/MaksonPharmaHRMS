import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '../api/employees';
import { fmtDate } from '../lib/format';

const SENSITIVE_FIELDS = ['pan', 'aadhaar', 'bankAccountNumber', 'pfNumber', 'esiNumber'] as const;
type SensitiveField = typeof SENSITIVE_FIELDS[number];

export function EmployeeDetail() {
  const { id } = useParams();
  const [unmasked, setUnmasked] = useState<Partial<Record<SensitiveField, string>>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getOne(id!),
    enabled: !!id,
  });

  const onUnmask = async (field: SensitiveField) => {
    if (!id) return;
    const reason = window.prompt(`Reason for unmasking ${field}? (audit-logged)`) ?? undefined;
    try {
      const res = await employeesApi.unmask(id, field, reason);
      setUnmasked((u) => ({ ...u, [field]: res.value }));
    } catch (e: any) {
      alert(e?.message ?? 'Unmask failed');
    }
  };

  if (isLoading) return <div className="text-text-muted">Loading...</div>;
  if (error || !data) return <div className="text-red">Failed to load employee.</div>;

  return (
    <div>
      <div className="mb-4">
        <Link to="/employees" className="text-sm text-primary hover:underline">{'←'} Back to employees</Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{data.name}</h1>
        <div className="text-sm text-text-muted font-mono">{data.empCode} · {data.biometricId}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Profile">
          <Row label="Department" value={data.department} />
          <Row label="Designation" value={data.designation} />
          <Row label="Location" value={data.location} />
          <Row label="Time Shift (real)" value={data.timeShift} />
          <Row label="Compliance Shift" value={data.alternateShift} />
          <Row label="Weekly Off" value={data.weeklyOff.join(', ')} />
          <Row label="Joined" value={fmtDate(data.joinDate.slice(0, 10))} />
          <Row label="Gender" value={data.gender} />
          <Row label="Status" value={data.status} />
        </Section>

        <Section title="Sensitive (masked by default)">
          <div className="text-xs text-text-muted mb-3">
            Tap "unmask" to reveal a value. Every unmask is audit-logged with your user, IP, time, and field.
          </div>
          {SENSITIVE_FIELDS.map((f) => (
            <div key={f} className="flex items-start justify-between py-2 border-b border-border last:border-0">
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wider text-text-subtle">{f}</div>
                <div className="font-mono text-sm">{unmasked[f] ?? (data as any)[f]}</div>
              </div>
              {!unmasked[f] && (
                <button onClick={() => onUnmask(f)} className="btn-outline text-xs">Unmask</button>
              )}
            </div>
          ))}

          <div className="mt-4 pt-4 border-t border-border space-y-1">
            <Row label="IFSC" value={data.ifsc} />
            <Row label="Bank" value={data.bankName} />
            <Row label="Account Holder" value={data.accountHolderName} />
            <Row label="Account Type" value={data.accountType} />
          </div>
        </Section>
      </div>
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
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
