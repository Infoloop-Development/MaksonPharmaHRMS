import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EmployeeCreateBodySchema,
  EmployeeCreateStep1Schema,
  EmployeePatchBodySchema,
  MAKSON_DEPARTMENTS,
  WeekdaySchema,
  type EmployeeMasked,
} from '@mams/types';
import { employeesApi } from '../api/employees';
import { ApiError } from '../api/client';
import { Modal } from '../components/ui/Modal';
import { SelectField } from '../components/ui/SelectField';
import { StatusToggle } from '../components/ui/StatusToggle';
import { DateField } from '../components/ui/DateField';
import { useToast } from '../components/ui/Toast';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';
import { useAuth } from '../store/auth';
import { employeeChangeRequestsApi } from '../api/employeeChangeRequests';
import { EMPTY_CELL } from '../lib/format';
import { BiometricIdBanner } from '../components/goLive/BiometricIdBanner';

const WEEKDAYS = WeekdaySchema.options;

type Draft = {
  biometricId: string;
  name: string;
  department: string;
  designation: string;
  location: string;
  timeShift: 'Day' | 'Night';
  alternateShift: 'A' | 'B' | 'C';
  weeklyOff: (typeof WEEKDAYS)[number];
  joinDate: string;
  gender: 'M' | 'F' | 'O';
  status: 'Active' | 'Inactive';
  pan: string;
  aadhaar: string;
  bankAccountNumber: string;
  ifsc: string;
  bankName: string;
  accountHolderName: string;
  accountType: 'Savings' | 'Current' | 'Salary';
  pfNumber: string;
  esiNumber: string;
};

const emptyDraft = (): Draft => ({
  biometricId: '',
  name: '',
  department: MAKSON_DEPARTMENTS[0] ?? 'Confectionery',
  designation: '',
  location: '',
  timeShift: 'Day',
  alternateShift: 'A',
  weeklyOff: 'Sunday',
  joinDate: '',
  gender: 'M',
  status: 'Active',
  pan: '',
  aadhaar: '',
  bankAccountNumber: '',
  ifsc: '',
  bankName: '',
  accountHolderName: '',
  accountType: 'Savings',
  pfNumber: '',
  esiNumber: '',
});

function issuesToRecord(issues: { path: (string | number)[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const iss of issues) {
    const key = iss.path[0];
    if (typeof key === 'string' && !out[key]) out[key] = iss.message;
  }
  return out;
}

const SENSITIVE_KEYS = [
  'pan',
  'aadhaar',
  'pfNumber',
  'esiNumber',
  'bankAccountNumber',
  'ifsc',
  'bankName',
  'accountHolderName',
  'accountType',
] as const;

function draftFromEmployee(employee: EmployeeMasked, isCompliant: boolean): Draft {
  if (!isCompliant && !employee.timeShift) {
    throw new Error('EmployeesAddModal: edit requires real view (timeShift is masked)');
  }
  return {
    biometricId: employee.biometricId,
    name: employee.name,
    department: employee.department,
    designation: employee.designation,
    location: employee.location,
    timeShift: employee.timeShift ?? 'Day',
    alternateShift: employee.alternateShift,
    weeklyOff: employee.weeklyOff[0] ?? 'Sunday',
    joinDate: employee.joinDate.slice(0, 10),
    gender: employee.gender,
    status: employee.status,
    pan: '',
    aadhaar: '',
    bankAccountNumber: '',
    ifsc: '',
    // Not masked for real view (see toMaskedEmployee), so safe to prefill like any other
    // regular field. Stays blank for compliant edit, where it's still masked.
    bankName: isCompliant ? '' : employee.bankName,
    accountHolderName: isCompliant ? '' : employee.accountHolderName,
    accountType: employee.accountType,
    pfNumber: '',
    esiNumber: '',
  };
}

export function EmployeesAddModal({
  onClose,
  mode = 'create',
  employee,
}: {
  onClose: () => void;
  mode?: 'create' | 'edit';
  employee?: EmployeeMasked;
}) {
  const user = useAuth((s) => s.user);
  const isCompliant = user?.viewMode === 'compliant';
  const isEdit = mode === 'edit' && !!employee;
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<Draft>(() => (isEdit && employee ? draftFromEmployee(employee, isCompliant) : emptyDraft()));
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const initialDraftRef = useRef<Draft | null>(isEdit && employee ? draftFromEmployee(employee, isCompliant) : null);

  const { data: nextCodeData, isLoading: nextCodeLoading } = useQuery({
    queryKey: ['employees', 'next-code'],
    queryFn: () => employeesApi.previewNextCode(),
    enabled: !isEdit,
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setFieldErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
    setFormError(null);
  };

  const step1Payload = useMemo(() => {
    const joinDate = draft.joinDate ? `${draft.joinDate}T00:00:00.000Z` : '';
    return {
      biometricId: draft.biometricId.trim(),
      name: draft.name.trim(),
      department: draft.department,
      designation: draft.designation.trim(),
      location: draft.location.trim(),
      timeShift: draft.timeShift,
      alternateShift: draft.alternateShift,
      weeklyOff: [draft.weeklyOff],
      joinDate,
      gender: draft.gender,
      status: draft.status,
    };
  }, [draft]);

  const fullPayload = useMemo(
    () => ({
      ...step1Payload,
      pan: draft.pan,
      aadhaar: draft.aadhaar,
      bankAccountNumber: draft.bankAccountNumber,
      ifsc: draft.ifsc,
      bankName: draft.bankName,
      accountHolderName: draft.accountHolderName,
      accountType: draft.accountType,
      pfNumber: draft.pfNumber,
      esiNumber: draft.esiNumber,
    }),
    [draft, step1Payload]
  );

  // Show the masked current value as a placeholder (never the real one) so the admin
  // can see a field has data without it being fetched unmasked into the form.
  const mp = isEdit ? employee : undefined;

  const hasChanges = useMemo(() => {
    if (!isEdit || !initialDraftRef.current) return true;
    return JSON.stringify(draft) !== JSON.stringify(initialDraftRef.current);
  }, [draft, isEdit]);

  const goStep2 = () => {
    setFormError(null);
    setReasonError('');
    const schemaToUse = isCompliant
      ? EmployeeCreateStep1Schema.omit({ timeShift: true })
      : EmployeeCreateStep1Schema;
    const parsed = schemaToUse.safeParse(step1Payload);
    if (!parsed.success) {
      setFieldErrors(issuesToRecord(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    setStep(2);
  };

  const onSubmit = async () => {
    setFormError(null);
    if (isCompliant && reason.trim().length < 10) {
      setReasonError('Reason must be at least 10 characters');
      return;
    }

    if (isCompliant) {
      setBusy(true);
      try {
        const proposedData = {
          biometricId: draft.biometricId.trim(),
          name: draft.name.trim(),
          gender: draft.gender,
          department: draft.department,
          designation: draft.designation.trim(),
          location: draft.location.trim(),
          alternateShift: draft.alternateShift,
          weeklyOff: [draft.weeklyOff],
          joinDate: draft.joinDate ? `${draft.joinDate}T00:00:00.000Z` : '',
          status: draft.status,
          ...(draft.pan.trim() ? { pan: draft.pan.trim() } : {}),
          ...(draft.aadhaar.trim() ? { aadhaar: draft.aadhaar.trim() } : {}),
          ...(draft.bankAccountNumber.trim() ? { bankAccountNumber: draft.bankAccountNumber.trim() } : {}),
          ...(draft.ifsc.trim() ? { ifsc: draft.ifsc.trim() } : {}),
          ...(draft.bankName.trim() ? { bankName: draft.bankName.trim() } : {}),
          ...(draft.accountHolderName.trim() ? { accountHolderName: draft.accountHolderName.trim() } : {}),
          ...(draft.pfNumber.trim() ? { pfNumber: draft.pfNumber.trim() } : {}),
          ...(draft.esiNumber.trim() ? { esiNumber: draft.esiNumber.trim() } : {}),
          accountType: draft.accountType,
        };
        if (isEdit && employee) {
          await employeeChangeRequestsApi.submit({ changeType: 'update', employeeId: employee.id, proposedData, reason });
          toast('Update request submitted for HR review', 'success');
        } else {
          await employeeChangeRequestsApi.submit({ changeType: 'create', proposedData, reason });
          toast('New employee request submitted for HR review', 'success');
        }
        qc.invalidateQueries({ queryKey: ['employee-change-requests'] });
        onClose();
      } catch (e: unknown) {
        setFormError(e instanceof Error ? e.message : 'Could not submit change request.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isEdit && employee) {
      const step1Parsed = EmployeeCreateStep1Schema.safeParse(step1Payload);
      if (!step1Parsed.success) {
        setFieldErrors(issuesToRecord(step1Parsed.error.issues));
        setStep(1);
        return;
      }
      const patch: Record<string, unknown> = { ...step1Parsed.data };
      for (const key of SENSITIVE_KEYS) {
        const raw = draft[key];
        if (typeof raw === 'string' && raw.trim()) {
          patch[key] = raw;
        }
      }
      const parsed = EmployeePatchBodySchema.safeParse(patch);
      if (!parsed.success) {
        setFieldErrors(issuesToRecord(parsed.error.issues));
        const paths = parsed.error.issues.map((i) => i.path[0]);
        if (paths.some((p) => SENSITIVE_KEYS.includes(String(p) as (typeof SENSITIVE_KEYS)[number]))) {
          setStep(2);
        } else {
          setStep(1);
        }
        return;
      }
      setBusy(true);
      try {
        await employeesApi.update(employee.id, parsed.data);
        toast('Employee updated', 'success');
        qc.invalidateQueries({ queryKey: ['employees'] });
        qc.invalidateQueries({ queryKey: ['employee', employee.id] });
        qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
        onClose();
      } catch (e: unknown) {
        if (e instanceof ApiError) {
          if (e.status === 400 && Array.isArray((e.details as { issues?: unknown })?.issues)) {
            const issues = (e.details as { issues: { path: (string | number)[]; message: string }[] }).issues;
            setFieldErrors(issuesToRecord(issues));
            setFormError('Fix the highlighted fields.');
            return;
          }
          if (e.status === 409) {
            setFormError(e.message);
            return;
          }
          setFormError(e.message);
          return;
        }
        setFormError('Could not update employee.');
      } finally {
        setBusy(false);
      }
      return;
    }

    const parsed = EmployeeCreateBodySchema.safeParse(fullPayload);
    if (!parsed.success) {
      setFieldErrors(issuesToRecord(parsed.error.issues));
      const paths = parsed.error.issues.map((i) => i.path[0]);
      const step2Keys = new Set([
        'pan', 'aadhaar', 'pfNumber', 'esiNumber', 'bankAccountNumber', 'ifsc', 'bankName', 'accountHolderName', 'accountType',
      ]);
      if (paths.some((p) => step2Keys.has(String(p)))) setStep(2);
      return;
    }
    setBusy(true);
    try {
      await employeesApi.create(parsed.data);
      toast('Employee created', 'success');
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employees', 'next-code'] });
      qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
      onClose();
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 400 && Array.isArray((e.details as { issues?: unknown })?.issues)) {
          const issues = (e.details as { issues: { path: (string | number)[]; message: string }[] }).issues;
          setFieldErrors(issuesToRecord(issues));
          setFormError('Fix the highlighted fields.');
          return;
        }
        if (
          e.status === 409 &&
          (e.code === 'duplicate_biometric_id' ||
            e.code === 'duplicate_emp_code' ||
            e.code === 'duplicate_key')
        ) {
          setFormError(e.message);
          return;
        }
        const msg = e.message.toLowerCase();
        if (msg.includes('e11000') || msg.includes('duplicate')) {
          setFormError(
            'This record conflicts with existing data. Check that employee code and biometric ID are both unique.'
          );
          return;
        }
        setFormError(e.message);
        return;
      }
      setFormError('Could not create employee.');
    } finally {
      setBusy(false);
    }
  };

  const err = (name: keyof Draft | string) => fieldErrors[name as string];

  const footer = (
    <>
      <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>
        Cancel
      </button>
      {step === 2 && (
        <button type="button" className="btn-outline" onClick={() => { setStep(1); setFormError(null); }} disabled={busy}>
          Back
        </button>
      )}
      {step === 1 ? (
        <button type="button" className="btn-primary" onClick={goStep2} disabled={busy}>
          Next
        </button>
      ) : (
        <button type="button" className="btn-primary" onClick={onSubmit} disabled={busy || (isEdit && !hasChanges)}>
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Save employee'}
        </button>
      )}
    </>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit employee' : 'Add employee'}
      size="xl"
      footer={footer}
    >
      <div className="space-y-6 text-sm">
        <div className="flex gap-2 border-b border-border pb-4">
          <div
            className={`flex-1 rounded-lg px-4 py-3 border-2 transition-colors ${
              step === 1 ? 'border-primary bg-primary-bg' : 'border-border bg-surface2'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Step 1</div>
            <div className="font-semibold text-text">Assignment and profile</div>
          </div>
          <div
            className={`flex-1 rounded-lg px-4 py-3 border-2 transition-colors ${
              step === 2 ? 'border-primary bg-primary-bg' : 'border-border bg-surface2'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Step 2</div>
            <div className="font-semibold text-text">Sensitive and bank</div>
          </div>
        </div>

        {formError && (
          <div className="text-sm text-red bg-red-bg px-3 py-2 rounded" role="alert">
            {formError}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8 animate-[fadeIn_0.15s_ease-out]">
            <BiometricIdBanner />
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="label">Employee code</div>
                  <div className="input bg-surface2 font-mono text-text font-semibold flex items-center min-h-[42px]">
                    {isEdit ? employee?.empCode : nextCodeLoading ? '…' : (nextCodeData?.nextEmpCode ?? EMPTY_CELL)}
                  </div>
                  <p className="mt-1 text-[11px] text-text-subtle">
                    {isEdit ? 'Employee code cannot be changed.' : 'Assigned automatically when you save.'}
                  </p>
                </div>
                <div>
                  <label htmlFor="add-bio" className="label">Biometric ID</label>
                  <input
                    id="add-bio"
                    className={`input font-mono ${err('biometricId') ? 'ring-1 ring-red' : ''}`}
                    value={draft.biometricId}
                    onChange={(e) => set('biometricId', e.target.value)}
                    placeholder="BIO1801"
                  />
                  {err('biometricId') ? (
                    <p className="mt-1 text-[11px] text-red">{err('biometricId')}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-text-subtle">
                      Must match the user ID on the biometric device exactly (same string IT enrolls on hardware).
                      Employee code is not used for punches.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-name" className="label">Name</label>
                  <input id="add-name" className={`input ${err('name') ? 'ring-1 ring-red' : ''}`} value={draft.name} onChange={(e) => set('name', e.target.value)} />
                  {err('name') && <p className="mt-1 text-[11px] text-red">{err('name')}</p>}
                </div>
                <SelectField id="add-dept" label="Department" value={draft.department} onChange={(v) => set('department', v)} error={err('department')}>
                  {MAKSON_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </SelectField>
                <div>
                  <label htmlFor="add-desig" className="label">Designation</label>
                  <input id="add-desig" className={`input ${err('designation') ? 'ring-1 ring-red' : ''}`} value={draft.designation} onChange={(e) => set('designation', e.target.value)} />
                  {err('designation') && <p className="mt-1 text-[11px] text-red">{err('designation')}</p>}
                </div>
                <div>
                  <label htmlFor="add-loc" className="label">Location</label>
                  <input id="add-loc" className={`input ${err('location') ? 'ring-1 ring-red' : ''}`} value={draft.location} onChange={(e) => set('location', e.target.value)} />
                  {err('location') && <p className="mt-1 text-[11px] text-red">{err('location')}</p>}
                </div>
                {!isCompliant && (
                  <SelectField id="add-shift" label="Time shift (real)" value={draft.timeShift} onChange={(v) => set('timeShift', v as Draft['timeShift'])} error={err('timeShift')}>
                    <option value="Day">Day</option>
                    <option value="Night">Night</option>
                  </SelectField>
                )}
                <SelectField id="add-comp" label="Compliance shift" value={draft.alternateShift} onChange={(v) => set('alternateShift', v as Draft['alternateShift'])} error={err('alternateShift')}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </SelectField>
                <SelectField id="add-wo" label="Weekly off" value={draft.weeklyOff} onChange={(v) => set('weeklyOff', v as Draft['weeklyOff'])} error={err('weeklyOff')}>
                  {WEEKDAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </SelectField>
                <DateField id="add-join" label="Joined" value={draft.joinDate} onChange={(v) => set('joinDate', v)} error={err('joinDate')} hint="Calendar uses your brand colours." />
                <SelectField id="add-gender" label="Gender" value={draft.gender} onChange={(v) => set('gender', v as Draft['gender'])} error={err('gender')}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Others</option>
                </SelectField>
                <StatusToggle value={draft.status} onChange={(v) => set('status', v)} error={err('status')} />
              </div>
            </section>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-[fadeIn_0.15s_ease-out]">
            {isEdit && (
              <p className="text-xs text-text-muted bg-surface2 border border-border rounded px-3 py-2">
                Sensitive and bank fields are pre-filled with current values. Edit only what needs to change.
              </p>
            )}
            <p className="text-xs text-text-muted">
              PAN and IFSC are normalised to uppercase. Aadhaar: 12 digits (format only in Phase 1). Bank account: 9–18 digits. ESI: 10 or 17 digits.
            </p>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Statutory</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-pan" className="label">PAN</label>
                  <input id="add-pan" className={`input font-mono uppercase ${err('pan') ? 'ring-1 ring-red' : ''}`} value={draft.pan} onChange={(e) => set('pan', e.target.value)} placeholder={mp?.pan || 'ABCDE1234F'} />
                  {err('pan') && <p className="mt-1 text-[11px] text-red">{err('pan')}</p>}
                </div>
                <div>
                  <label htmlFor="add-aad" className="label">Aadhaar</label>
                  <input id="add-aad" className={`input font-mono ${err('aadhaar') ? 'ring-1 ring-red' : ''}`} value={draft.aadhaar} onChange={(e) => set('aadhaar', e.target.value)} placeholder={mp?.aadhaar || '12 digits'} />
                  {err('aadhaar') && <p className="mt-1 text-[11px] text-red">{err('aadhaar')}</p>}
                </div>
                <div>
                  <label htmlFor="add-pf" className="label">PF number</label>
                  <input id="add-pf" className={`input font-mono ${err('pfNumber') ? 'ring-1 ring-red' : ''}`} value={draft.pfNumber} onChange={(e) => set('pfNumber', e.target.value)} placeholder={mp?.pfNumber || undefined} />
                  {err('pfNumber') && <p className="mt-1 text-[11px] text-red">{err('pfNumber')}</p>}
                </div>
              </div>
              <div className="mt-4 max-w-md">
                <label htmlFor="add-esi" className="label">ESI number</label>
                <input id="add-esi" className={`input font-mono ${err('esiNumber') ? 'ring-1 ring-red' : ''}`} value={draft.esiNumber} onChange={(e) => set('esiNumber', e.target.value)} placeholder={mp?.esiNumber || undefined} />
                {err('esiNumber') && <p className="mt-1 text-[11px] text-red">{err('esiNumber')}</p>}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Bank</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-bank" className="label">Bank name</label>
                  <input id="add-bank" className={`input ${err('bankName') ? 'ring-1 ring-red' : ''}`} value={draft.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder={mp?.bankName || undefined} />
                  {err('bankName') && <p className="mt-1 text-[11px] text-red">{err('bankName')}</p>}
                </div>
                <SelectField id="add-acct" label="Account type" value={draft.accountType} onChange={(v) => set('accountType', v as Draft['accountType'])} error={err('accountType')}>
                  <option value="Current">Current</option>
                  <option value="Savings">Savings</option>
                  <option value="Salary">Salary</option>
                </SelectField>
                <div>
                  <label htmlFor="add-bacct" className="label">Bank account number</label>
                  <input id="add-bacct" className={`input font-mono ${err('bankAccountNumber') ? 'ring-1 ring-red' : ''}`} value={draft.bankAccountNumber} onChange={(e) => set('bankAccountNumber', e.target.value)} placeholder={mp?.bankAccountNumber || undefined} />
                  {err('bankAccountNumber') && <p className="mt-1 text-[11px] text-red">{err('bankAccountNumber')}</p>}
                </div>
                <div>
                  <label htmlFor="add-holder" className="label">Account holder name</label>
                  <input id="add-holder" className={`input ${err('accountHolderName') ? 'ring-1 ring-red' : ''}`} value={draft.accountHolderName} onChange={(e) => set('accountHolderName', e.target.value)} placeholder={mp?.accountHolderName || undefined} />
                  {err('accountHolderName') && <p className="mt-1 text-[11px] text-red">{err('accountHolderName')}</p>}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="add-ifsc" className="label">IFSC code</label>
                  <input id="add-ifsc" className={`input font-mono uppercase max-w-md ${err('ifsc') ? 'ring-1 ring-red' : ''}`} value={draft.ifsc} onChange={(e) => set('ifsc', e.target.value)} placeholder={mp?.ifsc || undefined} />
                  {err('ifsc') && <p className="mt-1 text-[11px] text-red">{err('ifsc')}</p>}
                </div>
              </div>
            </section>

            {isCompliant && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Reason for change</h3>
                <div>
                  <textarea
                    className={`input w-full min-h-[80px] resize-y ${reasonError ? 'ring-1 ring-red' : ''}`}
                    placeholder="Describe why this change is needed (min 10 characters)…"
                    value={reason}
                    onChange={(e) => { setReason(e.target.value); setReasonError(''); }}
                  />
                  {reasonError && <p className="mt-1 text-[11px] text-red">{reasonError}</p>}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
