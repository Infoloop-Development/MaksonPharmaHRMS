import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ComplianceShift } from '@mams/types';
import { employeesApi } from '../../api/employees';
import {
  complianceAttendanceApi,
  type ComplianceReportOverride,
} from '../../api/complianceAttendance';
import { Modal } from '../ui/Modal';
import { Field, Input } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { BASELINE_HOURS } from '@mams/types';
import { EMPTY_CELL } from '../../lib/format';
import { useReportJob } from '../../hooks/useReportJob';

interface OverrideRow extends ComplianceReportOverride {
  key: string;
  empCode: string;
  name: string;
  department: string;
  alternateShift: ComplianceShift;
}

function defaultYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function ComplianceReportModal({
  onClose,
  initialYearMonth,
}: {
  onClose: () => void;
  initialYearMonth?: string;
}) {
  const toast = useToast((s) => s.push);
  const { job, isPolling, error: jobError, statusLabel, startJob } = useReportJob();
  const [yearMonth, setYearMonth] = useState(initialYearMonth ?? defaultYearMonth());
  const [empSearch, setEmpSearch] = useState('');
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const submitting = isPolling;

  const { data: empResults } = useQuery({
    queryKey: ['employees', 'compliance-report', empSearch],
    queryFn: () => employeesApi.list({ search: empSearch, pageSize: 20 }),
    enabled: empSearch.trim().length >= 2,
  });

  const overrideIds = useMemo(() => new Set(overrides.map((e) => e.employeeId)), [overrides]);

  const addOverride = (e: {
    id: string;
    name: string;
    empCode: string;
    department: string;
    alternateShift?: ComplianceShift;
  }) => {
    if (overrideIds.has(e.id)) return;
    setOverrides((rows) => [
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
    setOverrides((rows) =>
      rows.map((r) => (r.employeeId === employeeId ? { ...r, totalHours } : r))
    );
  };

  const removeOverride = (employeeId: string) => {
    setOverrides((rows) => rows.filter((r) => r.employeeId !== employeeId));
  };

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) errors.push('Choose a valid month');
    for (const row of overrides) {
      if (!Number.isFinite(row.totalHours) || row.totalHours < 0) {
        errors.push(`${row.empCode}: enter a valid hours value`);
      } else if (row.totalHours > BASELINE_HOURS) {
        errors.push(`${row.empCode}: hours can't exceed the ${BASELINE_HOURS} h baseline`);
      }
    }
    return errors;
  }, [yearMonth, overrides]);

  const onSubmit = async () => {
    setSubmitAttempted(true);
    if (validationErrors.length > 0) {
      toast(validationErrors[0]!, 'error');
      return;
    }
    try {
      const fallback = `compliance-attendance-${yearMonth}.xlsx`;
      await startJob(
        () =>
          complianceAttendanceApi.createComplianceReportJob({
            yearMonth,
            overrides: overrides.map(({ employeeId, totalHours }) => ({
              employeeId,
              totalHours,
            })),
          }),
        fallback
      );
      toast('Report ready — download started', 'success');
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
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
            {submitting ? statusLabel || 'Generating…' : 'Generate report'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Month" required>
          <Input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} />
        </Field>

        <p className="text-sm text-text-muted">
          The report includes <strong className="text-text">all active employees</strong> for the selected month.
          Search below to adjust total hours for specific employees, if needed.
        </p>

        <div className="border-b border-border pb-4">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Hour overrides (optional)
          </h3>
          <Field label="Search employees" hint="Search by name or code (min 2 characters)">
            <Input
              placeholder="Search to adjust hours for specific employees…"
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
                  const already = overrideIds.has(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      disabled={already}
                      className={`block w-full text-left px-3 py-2 text-sm border-b border-border/40 last:border-0 ${
                        already ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface2'
                      }`}
                      onClick={() => addOverride(e)}
                    >
                      {e.name}{' '}
                      <span className="font-mono text-xs text-text-muted">{e.empCode}</span>
                      {already && <span className="text-xs text-text-muted ml-2">(override added)</span>}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {overrides.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              Overrides ({overrides.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {overrides.map((row) => (
                <div
                  key={row.key}
                  className="card p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text truncate">{row.name}</div>
                    <div className="text-xs font-mono text-text-muted">
                      {row.empCode} · {row.department || EMPTY_CELL}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs text-text-muted whitespace-nowrap">Total hours</label>
                    <Input
                      type="number"
                      min={0}
                      max={BASELINE_HOURS}
                      step={0.5}
                      className={`w-28 font-mono ${row.totalHours > BASELINE_HOURS ? 'border-red text-red' : ''}`}
                      value={row.totalHours}
                      onChange={(e) => updateHours(row.employeeId, Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className="btn-outline btn-sm"
                      onClick={() => removeOverride(row.employeeId)}
                      aria-label={`Remove override for ${row.name}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {submitAttempted && validationErrors.length > 0 && (
          <div className="p-3 rounded-md bg-red/10 border border-red/30 text-sm text-red">
            {validationErrors[0]}
          </div>
        )}

        {(submitting || jobError) && (
          <div
            className={`p-3 rounded-md text-sm border ${
              jobError
                ? 'bg-red/10 border-red/30 text-red'
                : 'bg-primary-bg border-primary/30 text-primary-on-bg'
            }`}
          >
            {jobError ?? statusLabel ?? 'Starting report job…'}
          </div>
        )}
      </div>
    </Modal>
  );
}
