import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '../../api/employees';
import { complianceAttendanceApi } from '../../api/complianceAttendance';
import { Modal } from '../ui/Modal';
import { Field, Input } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { BASELINE_HOURS } from '@mams/types';

export interface FinancialReportEmployeeRow {
  key: string;
  employeeId: string;
  empCode: string;
  name: string;
  realHours: number;
  complianceHours: number | null;
}

function defaultYearMonth() {
  return '2026-05';
}

export function FinancialReportModal({
  onClose,
  initialYearMonth,
}: {
  onClose: () => void;
  initialYearMonth?: string;
}) {
  const toast = useToast((s) => s.push);
  const [yearMonth, setYearMonth] = useState(initialYearMonth ?? defaultYearMonth());
  const [empSearch, setEmpSearch] = useState('');
  const [selected, setSelected] = useState<FinancialReportEmployeeRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const { data: empResults } = useQuery({
    queryKey: ['employees', 'financial-report', empSearch],
    queryFn: () => employeesApi.list({ search: empSearch, pageSize: 20 }),
    enabled: empSearch.trim().length >= 2,
  });

  const selectedIds = useMemo(() => new Set(selected.map((e) => e.employeeId)), [selected]);

  const fetchComplianceHours = async (employeeId: string): Promise<number> => {
    const { complianceHours } = await complianceAttendanceApi.getMonthComplianceHours(employeeId, yearMonth);
    return complianceHours;
  };

  const addEmployee = async (e: { id: string; name: string; empCode: string }) => {
    if (selectedIds.has(e.id)) return;
    let complianceHours: number | null = null;
    try {
      complianceHours = await fetchComplianceHours(e.id);
    } catch {
      complianceHours = null;
    }
    setSelected((rows) => [
      ...rows,
      {
        key: e.id,
        employeeId: e.id,
        empCode: e.empCode,
        name: e.name,
        realHours: BASELINE_HOURS,
        complianceHours,
      },
    ]);
    setEmpSearch('');
  };

  const updateRealHours = (employeeId: string, realHours: number) => {
    setSelected((rows) => rows.map((r) => (r.employeeId === employeeId ? { ...r, realHours } : r)));
  };

  const removeEmployee = (employeeId: string) => {
    setSelected((rows) => rows.filter((r) => r.employeeId !== employeeId));
  };

  const refreshComplianceHours = async (ym: string, rows: FinancialReportEmployeeRow[]) => {
    const updated = await Promise.all(
      rows.map(async (row) => {
        try {
          const { complianceHours } = await complianceAttendanceApi.getMonthComplianceHours(
            row.employeeId,
            ym
          );
          return { ...row, complianceHours };
        } catch {
          return row;
        }
      })
    );
    setSelected(updated);
  };

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) errors.push('Choose a valid month');
    if (selected.length === 0) errors.push('Add at least one employee');
    for (const row of selected) {
      if (!Number.isFinite(row.realHours) || row.realHours < 0) {
        errors.push(`${row.empCode}: enter a valid real hours value`);
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
      await complianceAttendanceApi.downloadFinancialReport({
        yearMonth,
        employees: selected.map(({ employeeId, name, realHours }) => ({
          employeeId,
          name,
          realHours,
        })),
      });
      toast('Financial report download started', 'success');
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
      title="Download financial report"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={submitting} onClick={() => void onSubmit()}>
            {submitting ? 'Generating…' : 'Download Excel'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Month" required>
          <Input
            type="month"
            value={yearMonth}
            onChange={(e) => {
              const ym = e.target.value;
              setYearMonth(ym);
              if (selected.length > 0) {
                void refreshComplianceHours(ym, selected);
              }
            }}
          />
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
                      onClick={() => void addEmployee(e)}
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
              {selected.map((row) => {
                const cheque = Math.min(row.realHours, BASELINE_HOURS);
                const cash = Math.max(0, row.realHours - BASELINE_HOURS);
                const complianceDisplay =
                  row.complianceHours === null
                    ? '—'
                    : Math.min(row.complianceHours, BASELINE_HOURS).toFixed(1);
                return (
                  <div key={row.key} className="card p-3 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-text truncate">{row.name}</div>
                        <div className="text-xs font-mono text-text-muted">{row.empCode}</div>
                      </div>
                      <button
                        type="button"
                        className="btn-outline btn-sm shrink-0"
                        onClick={() => removeEmployee(row.employeeId)}
                        aria-label={`Remove ${row.name}`}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-text-muted uppercase tracking-wide">Compliance hrs</div>
                        <div className="font-mono text-text">{complianceDisplay}</div>
                      </div>
                      <div>
                        <label className="text-text-muted uppercase tracking-wide block mb-1">Real hours</label>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          className="w-full font-mono"
                          value={row.realHours}
                          onChange={(e) => updateRealHours(row.employeeId, Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <div className="text-text-muted uppercase tracking-wide">Cheque</div>
                        <div className="font-mono text-text">{cheque.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-text-muted uppercase tracking-wide">Cash</div>
                        <div className="font-mono text-text">{cash.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-text-muted">
          Compliance hours are summed from generated attendance for the month (capped at 208). Cheque payment is
          min(real hours, 208); cash is max(0, real − 208).
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
