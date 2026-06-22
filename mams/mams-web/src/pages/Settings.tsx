import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type Settings as SettingsT } from '../api/settings';
import { ApiError } from '../api/client';
import { usersApi, type UserSummary } from '../api/users';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { UserCardList } from '../components/settings/UserCardList';
import { Field, Input, Select, Textarea, Toggle } from '../components/ui/Field';
import type { ExportNamingSettings, Permission, Role, SensitiveUnmaskField, TimeFormat, UserPublic } from '@mams/types';
import { TIME_FORMAT_LABELS } from '../lib/timeFormat';
import { useTimeDisplay } from '../store/timeFormat';
import {
  DEFAULT_EXPORT_NAMING,
  EXPORT_NAMING_TOKENS,
  EXPORT_TYPE_LABELS,
  PERMISSIONS_BY_ROLE,
  ROLE_PERMISSION_CAP,
  buildExportFileName,
  normalizeExportNaming,
  type ExportFileNameContext,
  type ExportTypeKey,
} from '@mams/types';
import { UnmaskFieldGrantsSection } from '../components/settings/UnmaskFieldGrantsSection';
import { isUnmaskEnabled } from '../config/featureFlags';
import { z } from 'zod';
import { ActivityLogPanel } from '../components/activity/ActivityLogPanel';
import { BrandAssetsCard } from '../components/settings/BrandAssetsCard';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';
import { usePageTourController } from '../hooks/usePageTourController';
import { GiveMeATourButton } from '../components/onboarding/GiveMeATourButton';
import { settingsTourScript } from '../lib/onboarding/scripts/settingsTourScript';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const USERS_PAGE_SIZE = 5;

const ADD_USER_NAME_MAX = 120;
const ADD_USER_PASSWORD_MIN = 10;
const ADD_USER_PASSWORD_MAX = 128;
const ADD_USER_FORM_ID = 'add-user-form';
const EDIT_USER_FORM_ID = 'edit-user-form';

/** Human-readable labels for Settings permission checkboxes. */
const PERMISSION_LABELS: Record<Permission, string> = {
  'read.real': 'Read real (12h) attendance data',
  'read.compliant': 'Read compliant (8h) attendance data',
  'write.adjust': 'Submit attendance adjustments (pending approval)',
  'approve.adjust': 'Approve/reject adjustments',
  'write.regularization': 'Submit regularization requests (pending approval)',
  'approve.regularization': 'Approve/reject regularization requests',
  'unmask.sensitive': 'Unmask PAN, bank, Aadhaar, PF, ESI',
  'manage.users': 'Manage users',
  'manage.devices': 'Manage biometric devices',
  'manage.settings': 'Manage settings',
  'manage.export_naming': 'Configure export filename formats',
  'read.leave': 'View leave management data',
  'write.leave': 'Submit leave requests (pending approval)',
  'approve.leave': 'Approve/reject/cancel leave requests',
  'manage.leave': 'Full leave admin (setup, submit, and approve)',
  'read.visitors': 'View visitor requests',
  'approve.visitors': 'Approve/reject visitor requests',
  'manage.visitors': 'Manage visitor forms, links, and QR codes',
};

const PERMISSION_GROUPS: { label: string; permissions: readonly Permission[] }[] = [
  { label: 'Attendance data', permissions: ['read.real', 'read.compliant'] },
  { label: 'Adjustments', permissions: ['write.adjust', 'approve.adjust'] },
  { label: 'Regularization', permissions: ['write.regularization', 'approve.regularization'] },
  { label: 'Leave', permissions: ['read.leave', 'write.leave', 'approve.leave', 'manage.leave'] },
  { label: 'Visitors', permissions: ['read.visitors', 'approve.visitors', 'manage.visitors'] },
  { label: 'Sensitive data', permissions: ['unmask.sensitive'] },
  { label: 'Administration', permissions: ['manage.users', 'manage.devices', 'manage.settings', 'manage.export_naming'] },
];
const ADD_USER_PASSWORD_SPECIALS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`' as const;

function passwordPolicyScore(password: string): number {
  let n = 0;
  if (/[a-z]/.test(password)) n += 1;
  if (/[A-Z]/.test(password)) n += 1;
  if (/[0-9]/.test(password)) n += 1;
  if ([...password].some((c) => ADD_USER_PASSWORD_SPECIALS.includes(c))) n += 1;
  return n;
}

type AddUserFieldErrors = Partial<Record<'name' | 'email' | 'password', string>>;

function validateAddUserForm(values: { name: string; email: string; password: string }): AddUserFieldErrors {
  const errors: AddUserFieldErrors = {};
  const nameT = values.name.trim();
  if (!nameT) errors.name = 'Name is required';
  else if (nameT.length > ADD_USER_NAME_MAX) errors.name = `Name must be at most ${ADD_USER_NAME_MAX} characters`;

  const emailT = values.email.trim();
  if (!emailT) errors.email = 'Email is required';
  else {
    const parsed = z.string().email().safeParse(emailT);
    if (!parsed.success) {
      errors.email = parsed.error.issues[0]?.message ?? 'Enter a valid email address';
    }
  }

  if (!values.password) errors.password = 'Password is required';
  else if (values.password.length < ADD_USER_PASSWORD_MIN) {
    errors.password = `Password must be at least ${ADD_USER_PASSWORD_MIN} characters`;
  } else if (values.password.length > ADD_USER_PASSWORD_MAX) {
    errors.password = `Password must be at most ${ADD_USER_PASSWORD_MAX} characters`;
  } else if (passwordPolicyScore(values.password) < 3) {
    errors.password = `Use at least ${ADD_USER_PASSWORD_MIN} characters and include at least 3 of: uppercase, lowercase, number, symbol (${ADD_USER_PASSWORD_SPECIALS.slice(0, 10)}…).`;
  }

  return errors;
}

export function Settings() {
  const user = useAuth((s) => s.user);
  const canManage = user?.permissions.includes('manage.settings') ?? false;
  const canManageExportNaming = user?.permissions.includes('manage.export_naming') ?? false;
  const canManageUsers = user?.permissions.includes('manage.users') ?? false;

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  const tour = usePageTourController('settings', settingsTourScript, {
    ready: Boolean(data) && !isLoading,
  });

  if (isLoading) return <div className="text-text-muted">Loading...</div>;
  if (!data) return <div className="text-red">Failed to load settings.</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3" data-tour-id="settings-header">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
          <div className="text-sm text-text-muted">
            {canManage ? 'Edits are audit-logged.' : 'Read-only view (you do not have manage.settings permission).'}
          </div>
        </div>
        <GiveMeATourButton onClick={tour.onReplayTour} />
      </div>

      <div className="card p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-tour-id="settings-leave-link">
        <div>
          <h2 className="font-semibold text-sm">Leave management</h2>
          <p className="text-sm text-text-muted mt-1">
            National holidays, leave types, quotas, and leave requests are configured on the Leave page — not here.
          </p>
        </div>
        <Link to="/leave" className="btn-primary btn-sm shrink-0 self-start sm:self-center">
          Open Leave →
        </Link>
      </div>

      <div className="settings-layout">
        <SettingsLayoutCell full>
          <div data-tour-id="settings-time-branding">
            <TimeDisplayCard settings={data} canManage={canManage} />
          </div>
        </SettingsLayoutCell>
        <SettingsLayoutCell full>
          <BrandAssetsCard settings={data} canManage={canManage} />
        </SettingsLayoutCell>
        <SettingsLayoutCell>
          <div data-tour-id="settings-company">
            <CompanyInfoCard settings={data} canManage={canManage} />
          </div>
        </SettingsLayoutCell>
        <SettingsLayoutCell>
          <div data-tour-id="settings-compliance">
            <ComplianceCard settings={data} canManage={canManage} />
          </div>
        </SettingsLayoutCell>
        <SettingsLayoutCell>
          <div data-tour-id="settings-smart-anchor">
            <SmartAnchorCard settings={data} canManage={canManage} />
          </div>
        </SettingsLayoutCell>
        <SettingsLayoutCell>
          <div data-tour-id="settings-confidentiality">
            <ConfidentialityCard settings={data} canManage={canManage} />
          </div>
        </SettingsLayoutCell>
        <SettingsLayoutCell full>
          <div data-tour-id="settings-shifts">
            <ShiftsCard settings={data} canManage={canManage} />
          </div>
        </SettingsLayoutCell>
        <SettingsLayoutCell full>
          <div data-tour-id="settings-export-naming">
            <ExportNamingCard settings={data} canManage={canManageExportNaming} />
          </div>
        </SettingsLayoutCell>
        {canManageUsers && (
          <SettingsLayoutCell full>
            <div data-tour-id="settings-users">
              <UsersCard />
            </div>
          </SettingsLayoutCell>
        )}
        <SettingsLayoutCell full>
          <div data-tour-id="settings-activity">
          <SectionCard title="Activity">
            <ActivityLogPanel />
          </SectionCard>
          </div>
        </SettingsLayoutCell>
      </div>
    </div>
  );
}

function invalidateActivity(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
}

function SettingsLayoutCell({
  children,
  full = false,
}: {
  children: React.ReactNode;
  full?: boolean;
}) {
  return <div className={full ? 'settings-layout__full settings-layout__cell' : 'settings-layout__cell'}>{children}</div>;
}

function SectionCard({
  title,
  children,
  footer,
  headerRight,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className="card p-5 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-2 mb-4 shrink-0">
        <h2 className="text-base font-bold">{title}</h2>
        {headerRight}
      </div>
      <div className="space-y-3 flex-1 min-h-0">{children}</div>
      {footer && (
        <div className="mt-4 pt-4 border-t border-border settings-section-footer shrink-0">{footer}</div>
      )}
    </div>
  );
}

function EditSectionIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="shrink-0 inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-1.5 rounded-md text-text-muted hover:text-primary hover:bg-surface2 -mt-0.5 touch-target-sm"
      aria-label={label}
      onClick={onClick}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    </button>
  );
}

function useDirtyForm<T>(initial: T): [T, (patch: Partial<T>) => void, () => void, boolean] {
  const [draft, setDraft] = useState<T>(initial);
  useEffect(() => setDraft(initial), [JSON.stringify(initial)]);
  const set = (patch: Partial<T>) => setDraft((d) => ({ ...d, ...patch }));
  const reset = () => setDraft(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  return [draft, set, reset, dirty];
}

function pickChanged<T extends object>(initial: T, draft: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(draft) as (keyof T)[]) {
    if (JSON.stringify(initial[key]) !== JSON.stringify(draft[key])) {
      out[key] = draft[key];
    }
  }
  return out;
}

function TimeDisplayCard({ settings, canManage }: { settings: SettingsT; canManage: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const initial = { timeFormat: settings.timeFormat ?? '12h' };
  const [draft, set, reset, dirty] = useDirtyForm(initial);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => settingsApi.patch(pickChanged(initial, draft)),
    onSuccess: () => {
      toast('Time display updated', 'success');
      qc.invalidateQueries({ queryKey: ['settings'] });
      invalidateActivity(qc);
      setIsEditing(false);
    },
    onError: (e: any) => toast(e?.message ?? 'Save failed', 'error'),
  });

  const fieldsLocked = !canManage || !isEditing;
  const options: TimeFormat[] = ['24h', '12h'];

  return (
    <SectionCard
      title="Time display"
      headerRight={
        canManage && !isEditing ? (
          <EditSectionIconButton label="Edit time display" onClick={() => setIsEditing(true)} />
        ) : undefined
      }
      footer={
        canManage &&
        isEditing &&
        (dirty ? (
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                reset();
                setIsEditing(false);
              }}
            >
              Discard
            </button>
            <button type="button" className="btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </>
        ) : (
          <button type="button" className="btn-outline" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        ))
      }
    >
      <p className="text-sm text-text-muted">
        Applies to all HR and manager users across the app — how times are shown and entered (clocks, attendance, reports, regularization).
      </p>
      <div className="space-y-2 pt-1">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
              draft.timeFormat === opt ? 'border-primary bg-primary/5' : 'border-border bg-surface2/40'
            } ${fieldsLocked ? 'cursor-default opacity-90' : 'hover:bg-surface2'}`}
          >
            <input
              type="radio"
              name="timeFormat"
              value={opt}
              checked={draft.timeFormat === opt}
              onChange={() => set({ timeFormat: opt })}
              disabled={fieldsLocked}
              className="shrink-0"
            />
            <span className="font-medium text-sm">{TIME_FORMAT_LABELS[opt]}</span>
          </label>
        ))}
      </div>
      {!isEditing && (
        <div className="text-xs text-text-subtle pt-1">
          Current: {TIME_FORMAT_LABELS[draft.timeFormat]}
        </div>
      )}
    </SectionCard>
  );
}

function CompanyInfoCard({ settings, canManage }: { settings: SettingsT; canManage: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const initial = {
    companyName: settings.companyName,
    registeredAddress: settings.registeredAddress,
    signatoryName: settings.signatoryName,
    signatoryDesignation: settings.signatoryDesignation,
  };
  const [draft, set, reset, dirty] = useDirtyForm(initial);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => settingsApi.patch(pickChanged(initial, draft)),
    onSuccess: () => {
      toast('Company info updated', 'success');
      qc.invalidateQueries({ queryKey: ['settings'] });
      invalidateActivity(qc);
      setIsEditing(false);
    },
    onError: (e: any) => toast(e?.message ?? 'Save failed', 'error'),
  });

  const fieldsLocked = !canManage || !isEditing;

  return (
    <SectionCard
      title="Company Info"
      headerRight={
        canManage && !isEditing ? (
          <EditSectionIconButton label="Edit company info" onClick={() => setIsEditing(true)} />
        ) : undefined
      }
      footer={
        canManage &&
        isEditing &&
        (dirty ? (
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                reset();
                setIsEditing(false);
              }}
            >
              Discard
            </button>
            <button type="button" className="btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </>
        ) : (
          <button type="button" className="btn-outline" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        ))
      }
    >
      <Field label="Company Name">
        <Input value={draft.companyName} onChange={(e) => set({ companyName: e.target.value })} disabled={fieldsLocked} />
      </Field>
      <Field label="Registered Address">
        <Textarea value={draft.registeredAddress} onChange={(e) => set({ registeredAddress: e.target.value })} disabled={fieldsLocked} />
      </Field>
      <p className="text-xs text-text-muted -mt-1 mb-2">
        Company name and address appear on all report printouts and export headers. Signatory details appear on printed reports and exported files.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Signatory Name">
          <Input value={draft.signatoryName} onChange={(e) => set({ signatoryName: e.target.value })} disabled={fieldsLocked} />
        </Field>
        <Field label="Designation">
          <Input value={draft.signatoryDesignation} onChange={(e) => set({ signatoryDesignation: e.target.value })} disabled={fieldsLocked} />
        </Field>
      </div>
    </SectionCard>
  );
}

function ComplianceCard({ settings, canManage }: { settings: SettingsT; canManage: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const initial = {
    cin: settings.cin,
    gstin: settings.gstin,
    pfRegistrationNumber: settings.pfRegistrationNumber,
    esiRegistrationNumber: settings.esiRegistrationNumber,
    factoryLicenceNumber: settings.factoryLicenceNumber,
  };
  const [draft, set, reset, dirty] = useDirtyForm(initial);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => settingsApi.patch(pickChanged(initial, draft)),
    onSuccess: () => {
      toast('Compliance info updated', 'success');
      qc.invalidateQueries({ queryKey: ['settings'] });
      invalidateActivity(qc);
      setIsEditing(false);
    },
    onError: (e: any) => toast(e?.message ?? 'Save failed', 'error'),
  });

  const fieldsLocked = !canManage || !isEditing;

  return (
    <SectionCard
      title="Compliance Identifiers"
      headerRight={
        canManage && !isEditing ? (
          <EditSectionIconButton label="Edit compliance identifiers" onClick={() => setIsEditing(true)} />
        ) : undefined
      }
      footer={
        canManage &&
        isEditing &&
        (dirty ? (
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                reset();
                setIsEditing(false);
              }}
            >
              Discard
            </button>
            <button type="button" className="btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </>
        ) : (
          <button type="button" className="btn-outline" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        ))
      }
    >
      <Field label="CIN">
        <Input value={draft.cin} onChange={(e) => set({ cin: e.target.value })} disabled={fieldsLocked} />
      </Field>
      <Field label="GSTIN">
        <Input value={draft.gstin} onChange={(e) => set({ gstin: e.target.value })} disabled={fieldsLocked} />
      </Field>
      <Field label="PF Registration">
        <Input value={draft.pfRegistrationNumber} onChange={(e) => set({ pfRegistrationNumber: e.target.value })} disabled={fieldsLocked} />
      </Field>
      <Field label="ESI Registration">
        <Input value={draft.esiRegistrationNumber} onChange={(e) => set({ esiRegistrationNumber: e.target.value })} disabled={fieldsLocked} />
      </Field>
      <Field label="Factory Licence">
        <Input value={draft.factoryLicenceNumber} onChange={(e) => set({ factoryLicenceNumber: e.target.value })} disabled={fieldsLocked} />
      </Field>
    </SectionCard>
  );
}

function ShiftsCard({ settings, canManage }: { settings: SettingsT; canManage: boolean }) {
  const { fmtHhmm } = useTimeDisplay();
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  type ShiftRow = SettingsT['realShifts'][number];
  type EditingShift = { type: 'real' | 'compliance'; id: string; label: string; start: string; end: string };
  const [editingShift, setEditingShift] = useState<EditingShift | null>(null);
  const [weeklyOffDraft, setWeeklyOffDraft] = useState<string[] | null>(null);

  const shiftMutation = useMutation({
    mutationFn: (patch: { realShifts?: ShiftRow[]; complianceShifts?: ShiftRow[] }) =>
      settingsApi.patch(patch),
    onSuccess: () => {
      toast('Shift updated', 'success');
      qc.invalidateQueries({ queryKey: ['settings'] });
      invalidateActivity(qc);
      setEditingShift(null);
    },
    onError: (e: any) => toast(e?.message ?? 'Save failed', 'error'),
  });

  const weeklyOffMutation = useMutation({
    mutationFn: (days: string[]) => settingsApi.patch({ weeklyOffDefault: days }),
    onSuccess: () => {
      toast('Weekly off updated', 'success');
      qc.invalidateQueries({ queryKey: ['settings'] });
      invalidateActivity(qc);
      setWeeklyOffDraft(null);
    },
    onError: (e: any) => toast(e?.message ?? 'Save failed', 'error'),
  });

  function saveShift() {
    if (!editingShift) return;
    const updated = (editingShift.type === 'real' ? settings.realShifts : settings.complianceShifts).map((s) =>
      s.id === editingShift.id
        ? { ...s, label: editingShift.label, start: editingShift.start, end: editingShift.end }
        : s
    );
    shiftMutation.mutate(
      editingShift.type === 'real' ? { realShifts: updated } : { complianceShifts: updated }
    );
  }

  function renderShiftRow(s: ShiftRow, type: 'real' | 'compliance') {
    const isEditing = editingShift?.id === s.id && editingShift?.type === type;
    if (isEditing && editingShift) {
      return (
        <div key={s.id} className="py-2 border-b border-border last:border-0">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              className="input text-sm"
              value={editingShift.label}
              onChange={(e) => setEditingShift({ ...editingShift, label: e.target.value })}
              placeholder="Label"
            />
            <div className="flex gap-2 items-center">
              <input
                type="time"
                className="input text-sm font-mono"
                value={editingShift.start}
                onChange={(e) => setEditingShift({ ...editingShift, start: e.target.value })}
              />
              <span className="text-text-muted">–</span>
              <input
                type="time"
                className="input text-sm font-mono"
                value={editingShift.end}
                onChange={(e) => setEditingShift({ ...editingShift, end: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={saveShift}
                disabled={shiftMutation.isPending}
              >
                {shiftMutation.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => setEditingShift(null)}
                disabled={shiftMutation.isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
        <span className="font-medium">{s.label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{fmtHhmm(s.start)} – {fmtHhmm(s.end)}</span>
          {canManage && (
            <button
              type="button"
              className="shrink-0 inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-1.5 rounded-md text-text-muted hover:text-primary hover:bg-surface2 touch-target-sm"
              onClick={() => setEditingShift({ type, id: s.id, label: s.label, start: s.start, end: s.end })}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  const isEditingWeeklyOff = weeklyOffDraft !== null;
  const effectiveWeeklyOff = weeklyOffDraft ?? settings.weeklyOffDefault;

  return (
    <SectionCard title="Time Shifts">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-text-subtle mb-2">Real shifts (12-hour)</div>
          {settings.realShifts.map((s) => renderShiftRow(s, 'real'))}
        </div>
        <div className="min-w-0 md:border-l md:border-border md:pl-4">
          <div className="text-xs uppercase tracking-wider text-text-subtle mb-2">Compliance shifts (8-hour)</div>
          {settings.complianceShifts.map((s) => renderShiftRow(s, 'compliance'))}
        </div>
      </div>
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-wider text-text-subtle">Weekly off default</div>
          {canManage && !isEditingWeeklyOff && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setWeeklyOffDraft([...settings.weeklyOffDefault])}
            >
              Edit
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {WEEKDAYS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={!isEditingWeeklyOff}
              onClick={() => {
                if (!weeklyOffDraft) return;
                setWeeklyOffDraft(
                  weeklyOffDraft.includes(d)
                    ? weeklyOffDraft.filter((x) => x !== d)
                    : [...weeklyOffDraft, d]
                );
              }}
              className={isEditingWeeklyOff ? 'cursor-pointer' : 'cursor-default'}
            >
              <Badge tone={effectiveWeeklyOff.includes(d) ? 'blue' : 'gray'}>{d}</Badge>
            </button>
          ))}
        </div>
        {isEditingWeeklyOff && (
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => weeklyOffMutation.mutate(weeklyOffDraft!)}
              disabled={weeklyOffMutation.isPending}
            >
              {weeklyOffMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={() => setWeeklyOffDraft(null)}
              disabled={weeklyOffMutation.isPending}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function SmartAnchorCard({ settings, canManage }: { settings: SettingsT; canManage: boolean }) {
  const [enabled, setEnabled] = useState(settings.smartAnchorEnabled);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (next: boolean) => settingsApi.patch({ smartAnchorEnabled: next }),
    onSuccess: () => {
      toast('Smart Anchor setting updated', 'success');
      qc.invalidateQueries({ queryKey: ['settings'] });
      invalidateActivity(qc);
    },
    onError: (e: any) => toast(e?.message ?? 'Save failed', 'error'),
  });

  return (
    <SectionCard title="Smart Anchor v2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2">
        <div className="min-w-0">
          <div className="font-medium">Enable Smart Anchor</div>
          <div className="text-xs text-text-muted">Generate compliance punches within the 8-hour window. Deterministic per (employee, date).</div>
        </div>
        <Toggle
          checked={enabled}
          onChange={(v) => {
            if (!canManage) return;
            setEnabled(v);
            mutation.mutate(v);
          }}
        />
      </div>
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Engine version</span>
          <span className="font-mono text-sm">{settings.smartAnchorVersion}</span>
        </div>
      </div>
    </SectionCard>
  );
}

const EXPORT_PREVIEW_CONTEXT: Record<ExportTypeKey, ExportFileNameContext> = {
  dailyReportCsv: {
    department: 'Production',
    location: 'Surendranagar',
    startDate: '2026-03-14',
    endDate: '2026-03-20',
  },
  monthlyReportCsv: {
    department: 'Production',
    location: 'Surendranagar',
    asOfDate: '2026-06-01',
  },
  departmentReportCsv: {
    asOfDate: '2026-06-01',
  },
  locationReportCsv: {
    asOfDate: '2026-06-01',
  },
  leaveApplicationsCsv: {},
  dashboardAttendanceXlsx: {
    department: 'Production',
    asOfDate: '2026-06-09',
  },
};

function PermissionCheckboxList({
  role,
  selectedPerms,
  onToggle,
}: {
  role: Role;
  selectedPerms: Permission[];
  onToggle: (p: Permission) => void;
}) {
  const cap = ROLE_PERMISSION_CAP[role];
  const capSet = new Set(cap);
  const hideUnmask = role === 'hr.admin';

  const grouped = PERMISSION_GROUPS.map((g) => ({
    label: g.label,
    items: g.permissions.filter((p) => capSet.has(p) && !(hideUnmask && p === 'unmask.sensitive')),
  })).filter((g) => g.items.length > 0);

  const groupedSet = new Set(grouped.flatMap((g) => g.items));
  const ungrouped = cap.filter((p) => !groupedSet.has(p) && !(hideUnmask && p === 'unmask.sensitive'));

  const renderItem = (p: Permission) => (
    <label key={p} className="user-perm-chip">
      <input
        type="checkbox"
        className="mt-0.5 shrink-0"
        checked={selectedPerms.includes(p)}
        onChange={() => onToggle(p)}
      />
      <span className="leading-snug">{PERMISSION_LABELS[p]}</span>
    </label>
  );

  return (
    <div className="border border-border rounded-lg p-3 bg-surface2/40 space-y-4">
      {grouped.map((g) => (
        <div key={g.label}>
          <div className="text-[10px] uppercase tracking-wider text-text-subtle font-semibold mb-2">{g.label}</div>
          <div className="user-perm-grid">{g.items.map(renderItem)}</div>
        </div>
      ))}
      {ungrouped.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-subtle font-semibold mb-2">Other</div>
          <div className="user-perm-grid">{ungrouped.map(renderItem)}</div>
        </div>
      )}
    </div>
  );
}

function ExportNamingCard({ settings, canManage }: { settings: SettingsT; canManage: boolean }) {
  const initial = normalizeExportNaming(settings.exportNaming ?? DEFAULT_EXPORT_NAMING);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, set, reset, dirty] = useDirtyForm<ExportNamingSettings>(initial);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => settingsApi.patch({ exportNaming: draft }),
    onSuccess: () => {
      toast('Export filename formats saved', 'success');
      qc.invalidateQueries({ queryKey: ['settings'] });
      invalidateActivity(qc);
      setIsEditing(false);
    },
    onError: (e: unknown) => toast(e instanceof Error ? e.message : 'Save failed', 'error'),
  });

  const fieldsLocked = !canManage || !isEditing;

  const previewFor = (type: ExportTypeKey) =>
    buildExportFileName(
      type,
      EXPORT_PREVIEW_CONTEXT[type],
      draft,
      settings.companyName
    );

  const setPattern = (type: ExportTypeKey, value: string) => {
    set({ patterns: { ...draft.patterns, [type]: value } });
  };

  return (
    <SectionCard
      title="Export filename formats"
      headerRight={
        canManage && !isEditing ? (
          <EditSectionIconButton label="Edit export filename formats" onClick={() => setIsEditing(true)} />
        ) : null
      }
      footer={
        canManage &&
        isEditing && (
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                reset();
                setIsEditing(false);
              }}
            >
              Discard
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!dirty || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </>
        )
      }
    >
      {!canManage && (
        <p className="text-xs text-text-muted -mt-1 mb-1">
          Read-only — you do not have permission to change export filenames.
        </p>
      )}
      <p className="text-xs text-text-muted">
        Configure how downloaded CSV and Excel files are named. Changes apply to the next export only.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Company code (optional override)">
          <Input
            value={draft.companyCode}
            onChange={(e) => set({ companyCode: e.target.value.slice(0, 20) })}
            disabled={fieldsLocked}
            placeholder="Auto from company name if empty"
          />
        </Field>
        <Field label="Date format in filenames">
          <Select
            value={draft.dateFormat}
            onChange={(e) => set({ dateFormat: e.target.value as ExportNamingSettings['dateFormat'] })}
            disabled={fieldsLocked}
          >
            <option value="YYYYMMDD">YYYYMMDD (20260314)</option>
            <option value="DDMMYY">DDMMYY (140326)</option>
          </Select>
        </Field>
        <div className="flex items-end pb-1 sm:col-span-2 lg:col-span-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={draft.includeGeneratedTimestamp}
              onChange={(e) => set({ includeGeneratedTimestamp: e.target.checked })}
              disabled={fieldsLocked}
            />
            <span>Append download timestamp</span>
          </label>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-surface2/60 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle mb-1.5">
          Available tokens
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXPORT_NAMING_TOKENS.map((token) => (
            <span
              key={token}
              className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white border border-border text-text-muted"
            >
              {`{${token}}`}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {(Object.keys(EXPORT_TYPE_LABELS) as ExportTypeKey[]).map((type) => (
          <div key={type} className="space-y-1.5 rounded-lg border border-border bg-surface2/40 p-3 min-w-0">
            <Field label={EXPORT_TYPE_LABELS[type]}>
              <Input
                value={draft.patterns[type]}
                onChange={(e) => setPattern(type, e.target.value)}
                disabled={fieldsLocked}
                className="font-mono text-xs"
              />
            </Field>
            <div className="text-xs text-text-muted break-all">
              Preview: <span className="font-mono text-text">{previewFor(type)}</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ConfidentialityCard({ settings, canManage }: { settings: SettingsT; canManage: boolean }) {
  const initial = {
    confidentialityNoticeEnabled: settings.confidentialityNoticeEnabled,
    confidentialityNoticeText: settings.confidentialityNoticeText,
  };
  const [draft, set, reset, dirty] = useDirtyForm(initial);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => settingsApi.patch(pickChanged(initial, draft)),
    onSuccess: () => {
      toast('Confidentiality notice updated', 'success');
      qc.invalidateQueries({ queryKey: ['settings'] });
      invalidateActivity(qc);
    },
    onError: (e: any) => toast(e?.message ?? 'Save failed', 'error'),
  });

  return (
    <SectionCard
      title="Confidentiality Notice"
      footer={canManage && dirty && (
        <>
          <button className="btn-outline" onClick={reset}>Discard</button>
          <button className="btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </>
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm">Show confidentiality notice on exports</div>
        <Toggle
          checked={draft.confidentialityNoticeEnabled}
          onChange={(v) => set({ confidentialityNoticeEnabled: v })}
        />
      </div>
      <Field label="Notice text">
        <Textarea
          value={draft.confidentialityNoticeText}
          onChange={(e) => set({ confidentialityNoticeText: e.target.value })}
          disabled={!canManage}
          rows={4}
        />
      </Field>
    </SectionCard>
  );
}

function PasswordRevealToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="absolute inset-y-0 right-0 flex items-center justify-center px-2.5 text-text-muted hover:text-text hover:bg-surface2 rounded-r-md transition"
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
    >
      {visible ? (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1 4.24 4.24" />
          <path d="M1 1l22 22" />
        </svg>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

function UsersCard() {
  const [openAdd, setOpenAdd] = useState(false);
  const [editUser, setEditUser] = useState<UserSummary | null>(null);
  const [userPage, setUserPage] = useState(1);
  const sessionUser = useAuth((s) => s.user);
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const items = data?.items ?? [];
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const paginatedItems = items.slice((userPage - 1) * USERS_PAGE_SIZE, userPage * USERS_PAGE_SIZE);

  useEffect(() => {
    if (userPage > pageCount) setUserPage(pageCount);
  }, [userPage, pageCount]);

  return (
    <SectionCard
      title="Users"
      footer={
        <button className="btn-primary" onClick={() => setOpenAdd(true)}>+ Add User</button>
      }
    >
      <UserCardList
        items={paginatedItems}
        isLoading={isLoading}
        sessionUserId={sessionUser?.id}
        onEdit={setEditUser}
      />
      <div className="tbl-scroll hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Status</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={5} className="py-4 text-center text-text-muted">Loading...</td></tr>}
            {!isLoading && paginatedItems.map((u) => (
              <tr key={u._id}>
                <td className="py-2 font-medium">{u.name}</td>
                <td className="py-2 text-xs">{u.email}</td>
                <td className="py-2"><Badge tone="blue">{u.role}</Badge></td>
                <td className="py-2"><Badge tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    className="btn-outline text-xs px-3 py-2 min-h-[44px] sm:min-h-0 sm:py-1"
                    onClick={() => setEditUser(u)}
                  >
                    {sessionUser?.id === u._id ? 'Profile' : 'Edit'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isLoading && total > USERS_PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-text-muted">
            Page {userPage} of {pageCount}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-outline" onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={userPage === 1}>
              Previous
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setUserPage((p) => p + 1)}
              disabled={userPage * USERS_PAGE_SIZE >= total}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {openAdd && <AddUserModal onClose={() => setOpenAdd(false)} />}
      {editUser && (
        <EditUserModal
          user={editUser}
          selfMode={sessionUser?.id === editUser._id}
          onClose={() => setEditUser(null)}
        />
      )}
    </SectionCard>
  );
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('hr.admin');
  const [selectedPerms, setSelectedPerms] = useState<Permission[]>(
    () => [...PERMISSIONS_BY_ROLE['hr.admin']].filter((p) => p !== 'unmask.sensitive')
  );
  const [unmaskFieldGrants, setUnmaskFieldGrants] = useState<SensitiveUnmaskField[]>([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AddUserFieldErrors>({});
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      usersApi.create({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role,
        password,
        unmaskFieldGrants:
          isUnmaskEnabled() && role === 'hr.admin' ? unmaskFieldGrants : [],
        permissions:
          role === 'hr.compliance'
            ? undefined
            : selectedPerms.filter((p) => p !== 'unmask.sensitive'),
      }),
    onSuccess: (created) => {
      if (created.emailSent) {
        toast('User created. Welcome email sent with sign-in instructions.', 'success');
      } else if (created.emailError) {
        toast('User created, but welcome email could not be sent. Check server logs.', 'error');
      } else {
        toast('User created. They must change password on first login.', 'success');
      }
      qc.invalidateQueries({ queryKey: ['users'] });
      invalidateActivity(qc);
      onClose();
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        toast(e.message, 'error');
        return;
      }
      toast('Create failed', 'error');
    },
  });

  const clearFieldError = (key: keyof AddUserFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const cap = ROLE_PERMISSION_CAP[role];

  const togglePerm = (p: Permission) => {
    setSelectedPerms((prev) => {
      if (!cap.includes(p)) return prev;
      const next = prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p];
      if (next.length < 1) return prev;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = validateAddUserForm({ name, email, password });
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;
    mutation.mutate();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add User"
      size="lg"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            form={ADD_USER_FORM_ID}
            className="btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </>
      }
    >
      <form id={ADD_USER_FORM_ID} className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Field label="Name" required error={fieldErrors.name}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError('name');
            }}
            autoComplete="name"
          />
        </Field>
        <Field label="Email" required error={fieldErrors.email}>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError('email');
            }}
            autoComplete="email"
          />
        </Field>
        <Field label="Role" required>
          <Select
            value={role}
            onChange={(e) => {
              const r = e.target.value as Role;
              setRole(r);
              setSelectedPerms([...PERMISSIONS_BY_ROLE[r]].filter((p) => p !== 'unmask.sensitive'));
              if (r !== 'hr.admin') setUnmaskFieldGrants([]);
            }}
          >
            <option value="hr.admin">HR Admin (real view)</option>
            <option value="hr.compliance">Compliance Auditor (compliant view)</option>
            <option value="it.admin">IT Admin</option>
          </Select>
        </Field>
        {role !== 'hr.compliance' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">Permissions</div>
            <PermissionCheckboxList
              role={role}
              selectedPerms={selectedPerms}
              onToggle={togglePerm}
            />
          </div>
        )}
        {isUnmaskEnabled() && role === 'hr.admin' && (
          <UnmaskFieldGrantsSection grants={unmaskFieldGrants} onChange={setUnmaskFieldGrants} />
        )}
        <Field
          label="Initial password"
          required
          hint={`${ADD_USER_PASSWORD_MIN}–${ADD_USER_PASSWORD_MAX} characters; include at least 3 of: uppercase, lowercase, number, symbol (${ADD_USER_PASSWORD_SPECIALS.slice(0, 12)}…). User should change on first login.`}
          error={fieldErrors.password}
        >
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError('password');
              }}
              autoComplete="new-password"
              className="pr-11"
            />
            <PasswordRevealToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </div>
        </Field>
      </form>
    </Modal>
  );
}

function EditUserModal({
  user,
  selfMode,
  onClose,
}: {
  user: UserSummary;
  selfMode: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('hr.admin');
  const [unmaskFieldGrants, setUnmaskFieldGrants] = useState<SensitiveUnmaskField[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<Permission[]>([]);
  const [isActive, setIsActive] = useState(true);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    const p =
      Array.isArray(user.permissions) && user.permissions.length > 0
        ? [...user.permissions]
        : [...PERMISSIONS_BY_ROLE[user.role]];
    setSelectedPerms(p.filter((perm) => perm !== 'unmask.sensitive'));
    setUnmaskFieldGrants(
      Array.isArray(user.unmaskFieldGrants) ? [...user.unmaskFieldGrants] : []
    );
    setIsActive(user.isActive);
  }, [user]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (selfMode) {
        return usersApi.patch(user._id, { name: name.trim(), email: email.trim().toLowerCase() });
      }
      const permsForSave = selectedPerms.filter((p) => p !== 'unmask.sensitive');
      return usersApi.patch(user._id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        permissions: permsForSave,
        unmaskFieldGrants:
          isUnmaskEnabled() && role === 'hr.admin' ? unmaskFieldGrants : [],
        isActive,
      });
    },
    onSuccess: (res) => {
      if (selfMode && res && typeof res === 'object' && 'user' in res) {
        const refreshed = (res as { user: UserPublic }).user;
        const { accessToken, refreshToken } = useAuth.getState();
        if (accessToken && refreshToken) {
          useAuth.getState().setAuth({
            user: refreshed,
            accessToken,
            refreshToken,
          });
        }
      }
      toast(
        selfMode
          ? 'Profile updated.'
          : 'User updated. Previous sessions for this user were ended — they must sign in again.',
        'success'
      );
      qc.invalidateQueries({ queryKey: ['users'] });
      invalidateActivity(qc);
      onClose();
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) toast(e.message, 'error');
      else toast('Update failed', 'error');
    },
  });

  const cap = ROLE_PERMISSION_CAP[role];

  const togglePerm = (p: Permission) => {
    setSelectedPerms((prev) => {
      if (!cap.includes(p)) return prev;
      const next = prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p];
      if (next.length < 1) return prev;
      return next;
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={selfMode ? 'Edit profile' : 'Edit user'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            form={EDIT_USER_FORM_ID}
            className="btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form
        id={EDIT_USER_FORM_ID}
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        {!selfMode && (
          <>
            <Field label="Role" required>
              <Select
                value={role}
                onChange={(e) => {
                  const r = e.target.value as Role;
                  setRole(r);
                  setSelectedPerms([...PERMISSIONS_BY_ROLE[r]].filter((p) => p !== 'unmask.sensitive'));
                  setUnmaskFieldGrants([]);
                }}
              >
                <option value="hr.admin">HR Admin (real view)</option>
                <option value="hr.compliance">Compliance Auditor (compliant view)</option>
                <option value="it.admin">IT Admin</option>
              </Select>
            </Field>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm font-medium">Active</span>
              <Toggle checked={isActive} onChange={setIsActive} />
            </div>
            {isUnmaskEnabled() && role === 'hr.admin' && (
              <UnmaskFieldGrantsSection grants={unmaskFieldGrants} onChange={setUnmaskFieldGrants} />
            )}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">Permissions</div>
              <PermissionCheckboxList
                role={role}
                selectedPerms={selectedPerms}
                onToggle={togglePerm}
              />
            </div>
          </>
        )}
        {selfMode && (
          <p className="text-xs text-text-muted">
            You can change your name and email. Ask another admin to change your role or permissions.
          </p>
        )}
      </form>
    </Modal>
  );
}
