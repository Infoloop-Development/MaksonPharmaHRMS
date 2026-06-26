import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ComplianceShift } from '@mams/types';
import { employeesApi } from '../../api/employees';
import { complianceAttendanceApi, type ComplianceReportEmployee } from '../../api/complianceAttendance';
import { Modal } from '../ui/Modal';
import { Field, Input } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { BASELINE_HOURS } from '@mams/types';

export interface ReportEmployeeRow extends ComplianceReportEmployee {
  key: string;
}

function defaultYearMonth() {
  return '2026-05';
}

export function ComplianceReportModal({
  onClose,
  initialYearMonth,
}: {
  onClose: () => void;
  initialYearMonth?: string;
}) {
  const toast = useToast((s) => s.push);
  const [yearMonth, setYearMonth] = useState(initialYearMonth ?? defaultYearMonth());
  const [empSearch, setEmpSearch] = useState('');
  const [selected, setSelected] = useState<ReportEmployeeRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const { data: empResults } = useQuery({
    queryKey: ['employees', 'compliance-report', empSearch],
    queryFn: () => employeesApi.list({ search: empSearch, pageSize: 20 }),
    enabled: empSearch.trim().length >= 2,
  });

  const selectedIds = useMemo(() => new Set(selected.map((e) => e.employeeId)), [selected]);

  const addEmployee = (e: {
    id: string;
    name: string;
    empCode: string;
    department: string;
    alternateShift?: ComplianceShift;
  }) => {
    if (selectedIds.has(e.id)) return;
    setSelected((rows) => [
      ...rows,
      {
        key: e.id,
        employeeId: e.id,
        empCode: e.empCode,
        name: e.name,
        department: e.department ?? '',
        alternateShift: (e.alternateShift ?? 'A') as ComplianceShift,
        totalHours: BASELINE_HOURS,
      },
    ]);
    setEmpSearch('');
  };

  const updateHours = (employeeId: string, totalHours: number) => {
    setSelected((rows) =>
      rows.map((r) => (r.employeeId === employeeId ? { ...r, totalHours } : r))
    );
  };

  const removeEmployee = (employeeId: string) => {
    setSelected((rows) => rows.filter((r) => r.employeeId !== employeeId));
  };

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) errors.push('Choose a valid month');
    if (selected.length === 0) errors.push('Add at least one employee');
    for (const row of selected) {
      if (!Number.isFinite(row.totalHours) || row.totalHours < 0) {
        errors.push(`${row.empCode}: enter a valid hours value`);
      }
    }
    return errors;
  }, [yearMonth, selected]);

  const onSubmit = async () => {
    setSubmitAttempted(true);
    if (validationErrors.length > 0) {
      toast(validationErrors[0]!, 'error');
      return;
    }
    setSubmitting(true);
    try {
      await complianceAttendanceApi.downloadMonthlyReport({
        yearMonth,
        employees: selected.map(({ employeeId, empCode, name, department, alternateShift, totalHours }) => ({
          employeeId,
          empCode,
          name,
          department,
          alternateShift,
          totalHours,
        })),
      });
      toast('Report download started', 'success');
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      title="Generate monthly report"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={submitting} onClick={() => void onSubmit()}>
            {submitting ? 'Generating…' : 'Download report'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Month" required>
          <Input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} />
        </Field>

        <div className="border-b border-border pb-4">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Employees</h3>
          <Field label="Search employees" hint="Search by name or code (min 2 characters)">
            <Input
              placeholder="Search to add employees…"
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
            />
          </Field>
          {empResults?.items && empSearch.trim().length >= 2 && (
            <div className="mt-2 border border-border rounded-md max-h-40 overflow-y-auto">
              {empResults.items.length === 0 ? (
                <p className="px-3 py-2 text-sm text-text-muted">No employees found.</p>
              ) : (
                empResults.items.map((e) => {
                  const already = selectedIds.has(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      disabled={already}
                      className={`block w-full text-left px-3 py-2 text-sm border-b border-border/40 last:border-0 ${
                        already ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface2'
                      }`}
                      onClick={() => addEmployee(e)}
                    >
                      {e.name}{' '}
                      <span className="font-mono text-xs text-text-muted">{e.empCode}</span>
                      {already && <span className="text-xs text-text-muted ml-2">(added)</span>}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              Selected ({selected.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selected.map((row) => (
                <div
                  key={row.key}
                  className="card p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text truncate">{row.name}</div>
                    <div className="text-xs font-mono text-text-muted">
                      {row.empCode} · {row.department || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs text-text-muted whitespace-nowrap">Total hours</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      className="w-28 font-mono"
                      value={row.totalHours}
                      onChange={(e) => updateHours(row.employeeId, Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className="btn-outline btn-sm"
                      onClick={() => removeEmployee(row.employeeId)}
                      aria-label={`Remove ${row.name}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-text-muted">
          Leave days are distributed across weekdays using a deterministic monthly plan based on each employee&apos;s
          total hours (baseline 208 h / 26 days). Sundays are weekly off. Present days include generated clock-in/out
          times.
        </p>

        {submitAttempted && validationErrors.length > 0 && (
          <div className="p-3 rounded-md bg-red/10 border border-red/30 text-sm text-red">
            {validationErrors[0]}
          </div>
        )}
      </div>
    </Modal>
  );
}
