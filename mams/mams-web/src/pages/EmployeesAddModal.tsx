import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EmployeeCreateBodySchema,
  EmployeeCreateStep1Schema,
  MAKSON_DEPARTMENTS,
  WeekdaySchema,
} from '@mams/types';
import { employeesApi } from '../api/employees';
import { ApiError } from '../api/client';
import { Modal } from '../components/ui/Modal';
import { SelectField } from '../components/ui/SelectField';
import { StatusToggle } from '../components/ui/StatusToggle';
import { DateField } from '../components/ui/DateField';
import { useToast } from '../components/ui/Toast';

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

export function EmployeesAddModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  const { data: nextCodeData, isLoading: nextCodeLoading } = useQuery({
    queryKey: ['employees', 'next-code'],
    queryFn: () => employeesApi.previewNextCode(),
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

  const goStep2 = () => {
    setFormError(null);
    const parsed = EmployeeCreateStep1Schema.safeParse(step1Payload);
    if (!parsed.success) {
      setFieldErrors(issuesToRecord(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    setStep(2);
  };

  const onSubmit = async () => {
    setFormError(null);
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
        <button type="button" className="btn-primary" onClick={onSubmit} disabled={busy}>
          {busy ? 'Saving…' : 'Save employee'}
        </button>
      )}
    </>
  );

  return (
    <Modal open onClose={onClose} title="Add employee" size="xl" footer={footer}>
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
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="label">Employee code</div>
                  <div className="input bg-surface2 font-mono text-text font-semibold flex items-center min-h-[42px]">
                    {nextCodeLoading ? '…' : (nextCodeData?.nextEmpCode ?? '—')}
                  </div>
                  <p className="mt-1 text-[11px] text-text-subtle">Assigned automatically when you save.</p>
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
                <SelectField id="add-shift" label="Time shift (real)" value={draft.timeShift} onChange={(v) => set('timeShift', v as Draft['timeShift'])} error={err('timeShift')}>
                  <option value="Day">Day</option>
                  <option value="Night">Night</option>
                </SelectField>
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
            <p className="text-xs text-text-muted">
              PAN and IFSC are normalised to uppercase. Aadhaar: 12 digits (format only in Phase 1). Bank account: 9–18 digits. ESI: 10 or 17 digits.
            </p>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Statutory</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="add-pan" className="label">PAN</label>
                  <input id="add-pan" className={`input font-mono uppercase ${err('pan') ? 'ring-1 ring-red' : ''}`} value={draft.pan} onChange={(e) => set('pan', e.target.value)} placeholder="ABCDE1234F" />
                  {err('pan') && <p className="mt-1 text-[11px] text-red">{err('pan')}</p>}
                </div>
                <div>
                  <label htmlFor="add-aad" className="label">Aadhaar</label>
                  <input id="add-aad" className={`input font-mono ${err('aadhaar') ? 'ring-1 ring-red' : ''}`} value={draft.aadhaar} onChange={(e) => set('aadhaar', e.target.value)} placeholder="12 digits" />
                  {err('aadhaar') && <p className="mt-1 text-[11px] text-red">{err('aadhaar')}</p>}
                </div>
                <div>
                  <label htmlFor="add-pf" className="label">PF number</label>
                  <input id="add-pf" className={`input font-mono ${err('pfNumber') ? 'ring-1 ring-red' : ''}`} value={draft.pfNumber} onChange={(e) => set('pfNumber', e.target.value)} />
                  {err('pfNumber') && <p className="mt-1 text-[11px] text-red">{err('pfNumber')}</p>}
                </div>
              </div>
              <div className="mt-4 max-w-md">
                <label htmlFor="add-esi" className="label">ESI number</label>
                <input id="add-esi" className={`input font-mono ${err('esiNumber') ? 'ring-1 ring-red' : ''}`} value={draft.esiNumber} onChange={(e) => set('esiNumber', e.target.value)} />
                {err('esiNumber') && <p className="mt-1 text-[11px] text-red">{err('esiNumber')}</p>}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Bank</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-bank" className="label">Bank name</label>
                  <input id="add-bank" className={`input ${err('bankName') ? 'ring-1 ring-red' : ''}`} value={draft.bankName} onChange={(e) => set('bankName', e.target.value)} />
                  {err('bankName') && <p className="mt-1 text-[11px] text-red">{err('bankName')}</p>}
                </div>
                <SelectField id="add-acct" label="Account type" value={draft.accountType} onChange={(v) => set('accountType', v as Draft['accountType'])} error={err('accountType')}>
                  <option value="Current">Current</option>
                  <option value="Savings">Savings</option>
                  <option value="Salary">Salary</option>
                </SelectField>
                <div>
                  <label htmlFor="add-bacct" className="label">Bank account number</label>
                  <input id="add-bacct" className={`input font-mono ${err('bankAccountNumber') ? 'ring-1 ring-red' : ''}`} value={draft.bankAccountNumber} onChange={(e) => set('bankAccountNumber', e.target.value)} />
                  {err('bankAccountNumber') && <p className="mt-1 text-[11px] text-red">{err('bankAccountNumber')}</p>}
                </div>
                <div>
                  <label htmlFor="add-holder" className="label">Account holder name</label>
                  <input id="add-holder" className={`input ${err('accountHolderName') ? 'ring-1 ring-red' : ''}`} value={draft.accountHolderName} onChange={(e) => set('accountHolderName', e.target.value)} />
                  {err('accountHolderName') && <p className="mt-1 text-[11px] text-red">{err('accountHolderName')}</p>}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="add-ifsc" className="label">IFSC code</label>
                  <input id="add-ifsc" className={`input font-mono uppercase max-w-md ${err('ifsc') ? 'ring-1 ring-red' : ''}`} value={draft.ifsc} onChange={(e) => set('ifsc', e.target.value)} />
                  {err('ifsc') && <p className="mt-1 text-[11px] text-red">{err('ifsc')}</p>}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </Modal>
  );
}
