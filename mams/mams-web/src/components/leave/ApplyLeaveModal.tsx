import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { leaveApi } from '../../api/leave';
import { employeesApi } from '../../api/employees';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { calendarDaySpan } from './leaveUtils';

function getApplyValidationErrors(params: {
  employeeId: string;
  empSearch: string;
  leaveTypeId: string;
  typesCount: number;
  fromDate: string;
  effectiveTo: string;
  reason: string;
}): string[] {
  const errors: string[] = [];
  if (!params.employeeId) {
    errors.push(
      params.empSearch.trim().length >= 2
        ? 'Select an employee from the search results below'
        : 'Select an employee (search by name or code, min 2 characters)'
    );
  }
  if (!params.leaveTypeId) {
    errors.push(params.typesCount === 0 ? 'No leave types: seed defaults in Leave Settings first' : 'Select a leave type');
  }
  if (!params.fromDate) errors.push('Choose a start date');
  if (!params.effectiveTo) errors.push('Choose an end date');
  if (params.fromDate && params.effectiveTo && params.fromDate > params.effectiveTo) {
    errors.push('End date must be on or after start date');
  }
  if (!params.reason.trim()) errors.push('Enter a reason for leave');
  return errors;
}

export function ApplyLeaveModal({
  types,
  canApprove,
  onClose,
  onSuccess,
}: {
  types: { id: string; name: string; halfDayEligible: boolean }[];
  canApprove: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast((s) => s.push);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string; empCode: string } | null>(null);
  const [leaveTypeId, setLeaveTypeId] = useState(types[0]?.id ?? '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [halfPortion, setHalfPortion] = useState<'first' | 'second'>('first');
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const employeeId = selectedEmployee?.id ?? '';

  useEffect(() => {
    if (!halfDay && fromDate && (!toDate || toDate < fromDate)) {
      setToDate(fromDate);
    }
  }, [fromDate, halfDay, toDate]);

  const { data: empResults } = useQuery({
    queryKey: ['employees', 'pick', empSearch],
    queryFn: () => employeesApi.list({ search: empSearch, pageSize: 20 }),
    enabled: empSearch.length >= 2 && !selectedEmployee,
  });

  const selectedType = types.find((t) => t.id === leaveTypeId);
  const effectiveTo = halfDay ? fromDate : toDate;
  const estimatedDays = halfDay && selectedType?.halfDayEligible ? (fromDate ? 0.5 : 0) : calendarDaySpan(fromDate, effectiveTo);

  const { data: quotaPreview } = useQuery({
    queryKey: ['leave', 'quota-preview', employeeId, leaveTypeId, fromDate],
    queryFn: () => leaveApi.quotaPreview(employeeId, leaveTypeId, fromDate || undefined),
    enabled: Boolean(employeeId && leaveTypeId),
  });

  const validationErrors = useMemo(
    () =>
      getApplyValidationErrors({
        employeeId,
        empSearch,
        leaveTypeId,
        typesCount: types.length,
        fromDate,
        effectiveTo,
        reason,
      }),
    [employeeId, empSearch, leaveTypeId, types.length, fromDate, effectiveTo, reason]
  );

  const createMu = useMutation({
    mutationFn: () =>
      leaveApi.createApplication({
        employeeId,
        leaveTypeId,
        fromDate,
        toDate: effectiveTo,
        halfDayPortion: halfDay && selectedType?.halfDayEligible ? halfPortion : undefined,
        reason: reason.trim(),
        notifyEmployee: notify,
        adminApply: canApprove,
      }),
    onSuccess: () => {
      toast(canApprove ? 'Leave applied and approved' : 'Leave submitted for approval', 'success');
      onSuccess();
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const quotaWarn =
    quotaPreview?.paid &&
    quotaPreview.remaining !== undefined &&
    estimatedDays > 0 &&
    quotaPreview.remaining < estimatedDays;

  const onSubmit = () => {
    setSubmitAttempted(true);
    if (validationErrors.length > 0) {
      toast(validationErrors[0]!, 'error');
      return;
    }
    createMu.mutate();
  };

  const showValidation = submitAttempted && validationErrors.length > 0;
  const empPickHint = empSearch.length >= 2 && !employeeId && !selectedEmployee;

  return (
    <Modal
      open
      title="Apply leave (admin)"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={createMu.isPending} onClick={onSubmit}>
            {createMu.isPending ? 'Saving…' : 'Apply & Approve'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="border-b border-border pb-4">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Employee</h3>
          {selectedEmployee ? (
            <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-primary-bg border border-primary/20">
              <div>
                <div className="font-medium">{selectedEmployee.name}</div>
                <div className="text-xs font-mono text-text-muted">{selectedEmployee.empCode}</div>
              </div>
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => {
                  setSelectedEmployee(null);
                  setEmpSearch('');
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <Field label="Search employee" required>
                <Input
                  placeholder="Search by name or code (min 2 chars)…"
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                />
              </Field>
              {empPickHint && (
                <p className="text-sm text-red mt-1">Pick an employee from the list below.</p>
              )}
              {empResults?.items && empSearch.length >= 2 && (
                <div className="mt-2 border border-border rounded-md max-h-36 overflow-y-auto">
                  {empResults.items.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-text-muted">No employees found.</p>
                  ) : (
                    empResults.items.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-surface2 border-b border-border/40 last:border-0"
                        onClick={() => {
                          setSelectedEmployee({ id: e.id, name: e.name, empCode: e.empCode });
                          setEmpSearch(`${e.name} (${e.empCode})`);
                        }}
                      >
                        {e.name} <span className="font-mono text-xs text-text-muted">{e.empCode}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-b border-border pb-4">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Leave details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Leave type" required>
              <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
                {types.length === 0 && <option value="">No types configured</option>}
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Field>
            {selectedType?.halfDayEligible && (
              <Field label="Duration">
                <label className="flex items-center gap-2 text-sm h-10">
                  <input type="checkbox" checked={halfDay} onChange={(e) => setHalfDay(e.target.checked)} />
                  Half day only
                </label>
              </Field>
            )}
          </div>

          {halfDay && selectedType?.halfDayEligible && (
            <div className="mt-3">
            <Field label="Half">
              <Select value={halfPortion} onChange={(e) => setHalfPortion(e.target.value as 'first' | 'second')}>
                <option value="first">First half</option>
                <option value="second">Second half</option>
              </Select>
            </Field>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <Field label={halfDay ? 'Date' : 'From'} required>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </Field>
            {!halfDay && (
              <Field label="To" required>
                <Input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
              </Field>
            )}
          </div>

          {fromDate && effectiveTo && estimatedDays > 0 && (
            <p className="text-sm text-text-muted mt-2">
              Estimated span: <strong>{estimatedDays}</strong> calendar day{estimatedDays === 1 ? '' : 's'} (holidays excluded on save).
            </p>
          )}
        </div>

        {quotaPreview && employeeId && (
          <div className={`text-sm p-3 rounded-md ${quotaWarn ? 'bg-amber-bg border border-amber/30' : 'bg-surface2 border border-border'}`}>
            Remaining <strong>{quotaPreview.leaveTypeName}</strong> quota: <strong>{quotaPreview.remaining}</strong> days
            {quotaPreview.paid === false && <span className="text-text-muted"> (unpaid, not deducted)</span>}
            {quotaWarn && <div className="text-amber mt-1">Warning: requested days may exceed remaining quota.</div>}
          </div>
        )}

        <Field label="Reason" required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for leave (audit trail)" />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Notify employee (email when SMTP configured)
        </label>

        {showValidation && (
          <div className="p-3 rounded-md bg-red/10 border border-red/30 text-sm">
            <p className="font-medium text-red mb-1">Please fix the following:</p>
            <ul className="list-disc list-inside text-text-muted space-y-0.5">
              {validationErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
