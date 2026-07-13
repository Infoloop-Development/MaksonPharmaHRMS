import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, settingsOrgNotificationAlerts, type Settings as SettingsT } from '../api/settings';
import { ApiError } from '../api/client';
import { usersApi, type UserSummary } from '../api/users';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { UserCardList } from '../components/settings/UserCardList';
import { Field, Input, Select, Textarea, Toggle } from '../components/ui/Field';
import { PasswordRevealToggle } from '../components/ui/PasswordInput';
import type { ExportNamingSettings, OrgNotificationAlerts, Permission, Role, SensitiveUnmaskField, TimeFormat, UserPublic } from '@mams/types';
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
import { BrandThemeSection } from '../components/settings/BrandThemeSection';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';
import { usePageTourController } from '../hooks/usePageTourController';
import { GiveMeATourButton } from '../components/onboarding/GiveMeATourButton';
import { AdminSectionCard } from '../components/ui/AdminSectionCard';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePagination } from '../components/ui/TablePagination';
import { useTableSort } from '../lib/tableSort';
import { tableColumnTooltip } from '../lib/tooltips/tableColumnTooltips';
import { settingsTourScript } from '../lib/onboarding/scripts/settingsTourScript';
import { AppearanceSection } from '../components/ui/ThemeToggle';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { BulkActionBar } from '../components/ui/BulkActionBar';
import { BulkConfirmModal } from '../components/ui/BulkConfirmModal';
import { BulkSelectCheckbox } from '../components/ui/BulkSelectCheckbox';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const USERS_PAGE_SIZE = 5;

const ADD_USER_NAME_MAX = 120;
const ADD_USER_PASSWORD_MIN = 10;
const ADD_USER_PASSWORD_MAX = 128;
const ADD_USER_FORM_ID = 'add-user-form';
const EDIT_USER_FORM_ID = 'edit-user-form';

/** Human-readable labels for permission checkboxes. */
const PERMISSION_LABELS: Record<Permission, string> = {
  'read.real': 'Read real (12h) attendance data',
  'read.compliant': 'Read compliant (8h) attendance data',
  'write.adjust': 'Submit attendance adjustments (pending approval)',
  'approve.adjust': 'Approve/reject adjustments',
  'unmask.sensitive': 'Unmask PAN, bank, Aadhaar, PF, ESI',
  'manage.users': 'Manage users (legacy)',
  'manage.employees': 'Manage employee records',
  'manage.devices': 'Manage biometric devices',
  'manage.settings': 'Manage settings (legacy)',
  'manage.export_naming': 'Configure export filename formats',
  'manage.org_users': 'Manage organization users & roles',
  'manage.org_settings': 'Manage organization settings',
  'manage.security': 'Security policy & session control',
  'read.org_audit': 'View organization audit log',
  'manage.feature_flags': 'Manage feature flags',
  'read.system_health': 'View system health',
  'read.leave': 'View leave management data',
  'write.leave': 'Submit leave requests (pending approval)',
  'approve.leave': 'Approve/reject/cancel leave requests',
  'manage.leave': 'Full leave admin (setup, submit, and approve)',
  'read.visitors': 'View visitor requests',
  'approve.visitors': 'Approve/reject visitor requests',
  'manage.visitors': 'Manage visitor forms, links, and QR codes',
  'read.compliance_activity': 'View compliance activity log',
  'write.employee_change': 'Submit employee add/edit/delete change requests',
  'approve.employee_change': 'Approve/reject employee change requests',
  'manage.recycle_bin': 'View recycle bin, restore or permanently delete items',
  'manage.bug_reports': 'Review and manage user-submitted bug reports',
};

const PERMISSION_GROUPS: { label: string; permissions: readonly Permission[] }[] = [
  { label: 'Attendance data', permissions: ['read.real', 'read.compliant'] },
  { label: 'Adjustments', permissions: ['write.adjust', 'approve.adjust'] },
  { label: 'Leave', permissions: ['read.leave', 'write.leave', 'approve.leave', 'manage.leave'] },
  { label: 'Visitors', permissions: ['read.visitors', 'approve.visitors', 'manage.visitors'] },
  { label: 'Sensitive data', permissions: ['unmask.sensitive'] },
  { label: 'HR operations', permissions: ['manage.employees', 'manage.devices', 'write.employee_change', 'approve.employee_change'] },
  { label: 'Compliance', permissions: ['read.compliance_activity'] },
  {
    label: 'Organization admin',
    permissions: [
      'manage.org_users',
      'manage.org_settings',
      'manage.security',
      'read.org_audit',
      'manage.feature_flags',
      'read.system_health',
      'manage.export_naming',
      'manage.recycle_bin',
      'manage.bug_reports',
    ],
  },
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
  const canManageShifts = user?.permissions.includes('manage.org_settings') ?? false;

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
          <h1 className="text-xl sm:text-2xl font-bold">HR Settings</h1>
          <div className="text-sm text-text-muted">
            Operational shortcuts and shift reference. Organization-wide config is in Admin → Organization.
          </div>
        </div>
        <GiveMeATourButton onClick={tour.onReplayTour} />
      </div>

      <div className="card p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-tour-id="settings-leave-link">
        <div>
          <h2 className="font-semibold text-sm">Leave management</h2>
          <p className="text-sm text-text-muted mt-1">
            National holidays, leave types, quotas, and leave requests are configured on the Leave page, not here.
          </p>
        </div>
        <Link to="/leave" className="btn-primary btn-sm shrink-0 self-start sm:self-center">
          Open Leave →
        </Link>
      </div>

      <div className="settings-layout">
        <SettingsLayoutCell full>
          <AppearanceSection />
        </SettingsLayoutCell>
        <SettingsLayoutCell full>
          <div data-tour-id="settings-shifts">
            <ShiftsCard settings={data} canManage={canManageShifts} />
          </div>
        </SettingsLayoutCell>
        <SettingsLayoutCell full>
          <div data-tour-id="settings-activity">
          <SectionCard title="My activity">
            <ActivityLogPanel />
          </SectionCard>
          </div>
        </SettingsLayoutCell>
      </div>
    </div>
  );
}

export function OrganizationSettingsPanel() {
  const user = useAuth((s) => s.user);
  const canManage = user?.permissions.includes('manage.org_settings') ?? false;
  const canManageExportNaming =
    user?.permissions.includes('manage.org_settings') ||
    user?.permissions.includes('manage.export_naming') ||
    false;

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const [logoVersion, setLogoVersion] = useState<string | null>(null);

  if (isLoading) return <div className="text-text-muted">Loading...</div>;
  if (!data) return <div className="text-red">Failed to load settings.</div>;

  return (
    <div className="settings-layout">
      <SettingsLayoutCell full>
        <AppearanceSection />
        <p className="text-xs text-text-muted mt-2">
          Theme is saved per user. Logo and company name above are organization-wide.
        </p>
      </SettingsLayoutCell>
      <SettingsLayoutCell full>
        <TimeDisplayCard settings={data} canManage={canManage} />
      </SettingsLayoutCell>
      <SettingsLayoutCell full>
        <OrgNotificationAlertsCard settings={data} canManage={canManage} />
      </SettingsLayoutCell>
      <SettingsLayoutCell full>
        <BrandAssetsCard
          settings={data}
          canManage={canManage}
          onLogoUpdated={(url) => setLogoVersion(url ?? `removed-${Date.now()}`)}
        />
      </SettingsLayoutCell>
      <SettingsLayoutCell full>
        <BrandThemeSection settings={data} canManage={canManage} logoVersion={logoVersion} />
      </SettingsLayoutCell>
      <SettingsLayoutCell>
        <CompanyInfoCard settings={data} canManage={canManage} />
      </SettingsLayoutCell>
      <SettingsLayoutCell>
        <ComplianceCard settings={data} canManage={canManage} />
      </SettingsLayoutCell>
      <SettingsLayoutCell>
        <SmartAnchorCard settings={data} canManage={canManage} />
      </SettingsLayoutCell>
      <SettingsLayoutCell>
        <ConfidentialityCard settings={data} canManage={canManage} />
      </SettingsLayoutCell>
      <SettingsLayoutCell full>
        <ShiftsCard settings={data} canManage={canManage} />
      </SettingsLayoutCell>
      <SettingsLayoutCell full>
        <ExportNamingCard settings={data} canManage={canManageExportNaming} />
      </SettingsLayoutCell>
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

export function SectionCard({
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
    <AdminSectionCard title={title} footer={footer} headerRight={headerRight}>
      {children}
    </AdminSectionCard>
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

function OrgNotificationAlertsCard({ settings, canManage }: { settings: SettingsT; canManage: boolean }) {
  const initial = { orgNotificationAlerts: settingsOrgNotificationAlerts(settings) };
  const [draft, set, reset, dirty] = useDirtyForm(initial);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => settingsApi.patch(pickChanged(initial, draft)),
    onSuccess: () => {
      toast('Notification settings saved', 'success');
      qc.invalidateQueries({ queryKey: ['settings'] });
      invalidateActivity(qc);
    },
    onError: (e: any) => toast(e?.message ?? 'Save failed', 'error'),
  });

  const rows: { key: keyof OrgNotificationAlerts; label: string; description: string }[] = [
    {
      key: 'visitorSubmitted',
      label: 'Visitor form submissions',
      description: 'Notify org admins when a visitor completes a public form.',
    },
    {
      key: 'leaveApplied',
      label: 'New leave applications',
      description: 'Notify org admins when leave is submitted or recorded.',
    },
    {
      key: 'deviceRegistered',
      label: 'New biometric / device registrations',
      description: 'Notify org admins when a new attendance device is registered.',
    },
  ];

  const setAlert = (key: keyof OrgNotificationAlerts, value: boolean) => {
    set({ orgNotificationAlerts: { ...draft.orgNotificationAlerts, [key]: value } });
  };

  return (
    <SectionCard
      title="Admin notifications"
      footer={
        canManage &&
        dirty && (
          <>
            <button type="button" className="btn-outline" onClick={reset}>
              Discard
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Saving...' : 'Save notification settings'}
            </button>
          </>
        )
      }
    >
      <p className="text-sm text-text-muted mb-4">
        Control which events appear in the org admin notification bell. All alerts are on by default; turn off any you
        do not need. Changes apply after you save.
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-border bg-surface2 px-3 py-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-text">{row.label}</div>
              <div className="text-xs text-text-muted mt-0.5 leading-relaxed">{row.description}</div>
            </div>
            <Toggle
              checked={draft.orgNotificationAlerts[row.key]}
              onChange={(v) => setAlert(row.key, v)}
              disabled={!canManage}
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
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
        Applies to all HR and manager users across the app: how times are shown and entered (clocks, attendance, reports).
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

  return (
    <SectionCard title="Time Shifts">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-text-subtle mb-2">Real shifts (12-hour)</div>
          {settings.realShifts.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="font-medium">{s.label}</span>
              <span className="font-mono text-sm">{fmtHhmm(s.start)} - {fmtHhmm(s.end)}</span>
            </div>
          ))}
        </div>
        <div className="min-w-0 md:border-l md:border-border md:pl-4">
          <div className="text-xs uppercase tracking-wider text-text-subtle mb-2">Compliance shifts (8-hour)</div>
          {settings.complianceShifts.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="font-medium">{s.label}</span>
              <span className="font-mono text-sm">{fmtHhmm(s.start)} - {fmtHhmm(s.end)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pt-3 border-t border-border">
        <div className="text-xs uppercase tracking-wider text-text-subtle mb-2">Weekly off default</div>
        <div className="flex gap-2 flex-wrap">
          {WEEKDAYS.map((d) => (
            <Badge key={d} tone={settings.weeklyOffDefault.includes(d) ? 'blue' : 'gray'}>{d}</Badge>
          ))}
        </div>
      </div>
      {canManage && (
        <div className="text-xs text-text-subtle pt-2">
          Inline edit for shifts and weekly-off coming in Phase 1 sprint 6. Schema and PATCH endpoint already support it.
        </div>
      )}
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
  adminOverviewAttendanceXlsx: {
    department: 'Production',
    asOfDate: '2026-06-09',
  },
  adminOverviewEmployeesXlsx: {
    department: 'Production',
    asOfDate: '2026-06-09',
  },
  adminOverviewUsersXlsx: {
    asOfDate: '2026-06-09',
  },
  adminOverviewDevicesXlsx: {
    location: 'Surendranagar',
    asOfDate: '2026-06-09',
  },
  adminOverviewAuditXlsx: {
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
          Read-only: you do not have permission to change export filenames.
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
              className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted"
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

export function UsersManagementPanel() {
  const [openAdd, setOpenAdd] = useState(false);
  const [editUser, setEditUser] = useState<UserSummary | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const sessionUser = useAuth((s) => s.user);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const bulk = useBulkSelection();
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const items = data?.items ?? [];
  const getUserSortValue = useCallback((row: UserSummary, col: string) => {
    if (col === 'name') return row.name;
    if (col === 'email') return row.email;
    if (col === 'role') return row.role;
    if (col === 'status') return row.isActive ? 'Active' : 'Inactive';
    return '';
  }, []);
  const { sortCol, toggleSort, sortArrow, sortedRows } = useTableSort(items, getUserSortValue);
  const total = sortedRows.length;
  const pageCount = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const paginatedItems = sortedRows.slice((userPage - 1) * USERS_PAGE_SIZE, userPage * USERS_PAGE_SIZE);
  const pageIds = useMemo(() => paginatedItems.map((u) => u._id), [paginatedItems]);
  const pageCheck = bulk.pageSelectionState(pageIds);
  const selectedUsers = useMemo(
    () => paginatedItems.filter((u) => bulk.isSelected(u._id)),
    [paginatedItems, bulk]
  );

  useEffect(() => {
    if (userPage > pageCount) setUserPage(pageCount);
  }, [userPage, pageCount]);

  useEffect(() => {
    bulk.clear();
  }, [userPage, sortCol]);

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.patch(id, { isActive }),
    onMutate: ({ id }) => setTogglingUserId(id),
    onSettled: () => setTogglingUserId(null),
    onSuccess: (_, { isActive }) => {
      toast(
        isActive
          ? 'User activated.'
          : 'User deactivated. Previous sessions were ended; they must sign in again if reactivated.',
        'success'
      );
      qc.invalidateQueries({ queryKey: ['users'] });
      invalidateActivity(qc);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) toast(e.message, 'error');
      else toast('Could not update user status', 'error');
    },
  });

  const handleToggleActive = (u: UserSummary, next: boolean) => {
    if (sessionUser?.id === u._id) return;
    toggleActiveMutation.mutate({ id: u._id, isActive: next });
  };

  return (
    <SectionCard
      title="Users"
      footer={
        <button className="btn-primary btn-sm" onClick={() => setOpenAdd(true)}>+ Add User</button>
      }
    >
      <BulkActionBar
        count={bulk.count}
        overLimit={bulk.overLimit}
        actionLabel="Deactivate selected"
        onAction={() => setBulkDeactivateOpen(true)}
        onClear={bulk.clear}
      />
      <UserCardList
        items={paginatedItems}
        isLoading={isLoading}
        sessionUserId={sessionUser?.id}
        selectable
        isSelected={bulk.isSelected}
        onToggleSelect={bulk.toggle}
        togglingUserId={togglingUserId}
        onToggleActive={handleToggleActive}
        onEdit={setEditUser}
      />
      <div className="tbl-scroll hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3 w-10 align-middle">
                <BulkSelectCheckbox
                  checked={pageCheck.allSelected && pageIds.length > 0}
                  indeterminate={pageCheck.someSelected}
                  onChange={() => bulk.togglePage(pageIds)}
                  ariaLabel="Select all users on this page"
                />
              </th>
              <SortableTh label="Name" sortKey="name" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('settings', 'name')} />
              <SortableTh label="Email" sortKey="email" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('settings', 'email')} />
              <SortableTh label="Role" sortKey="role" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('settings', 'role')} />
              <SortableTh label="Status" sortKey="status" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('settings', 'status')} />
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={6} className="px-4 py-4 text-center text-text-muted">Loading...</td></tr>}
            {!isLoading && paginatedItems.map((u) => (
              <tr key={u._id} className="hover:bg-surface2/50 transition">
                <td className="px-4 py-3 align-middle">
                  <BulkSelectCheckbox
                    checked={bulk.isSelected(u._id)}
                    onChange={() => bulk.toggle(u._id)}
                    ariaLabel={`Select ${u.name}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium align-middle">{u.name}</td>
                <td className="px-4 py-3 text-xs align-middle">{u.email}</td>
                <td className="px-4 py-3 align-middle"><Badge tone="blue">{u.role}</Badge></td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={u.isActive}
                      onChange={(next) => handleToggleActive(u, next)}
                      disabled={sessionUser?.id === u._id || togglingUserId === u._id}
                    />
                    <span className="text-xs text-text-muted">{u.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right align-middle">
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
        <TablePagination
          page={userPage}
          totalPages={pageCount}
          onPrev={() => setUserPage((p) => Math.max(1, p - 1))}
          onNext={() => setUserPage((p) => p + 1)}
        />
      )}
      {openAdd && <AddUserModal onClose={() => setOpenAdd(false)} />}
      {editUser && (
        <EditUserModal
          user={editUser}
          selfMode={sessionUser?.id === editUser._id}
          onClose={() => setEditUser(null)}
        />
      )}
      <BulkConfirmModal
        open={bulkDeactivateOpen}
        onClose={() => setBulkDeactivateOpen(false)}
        title="Deactivate selected users?"
        description={
          <>
            Deactivate <strong>{bulk.count}</strong> user{bulk.count !== 1 ? 's' : ''}? Their sessions will be
            ended and they cannot sign in until reactivated.
          </>
        }
        itemLabels={selectedUsers.map((u) => `${u.name} (${u.email})`)}
        confirmLabel="Deactivate users"
        onConfirm={async () => {
          const result = await usersApi.bulkDeactivate(bulk.ids);
          toast(
            `Deactivated ${result.succeeded} user${result.succeeded !== 1 ? 's' : ''}${
              result.skipped ? `, ${result.skipped} skipped` : ''
            }`,
            result.succeeded > 0 ? 'success' : 'error'
          );
          qc.invalidateQueries({ queryKey: ['users'] });
          invalidateActivity(qc);
          bulk.clear();
          return result;
        }}
      />
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
  const { data: mailStatus } = useQuery({
    queryKey: ['users', 'mail-status'],
    queryFn: usersApi.mailStatus,
  });
  const mailEnabled = mailStatus?.mailEnabled ?? false;
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
      if (created.emailSent && created.devSinkPath) {
        toast(
          `User created. Welcome email saved locally — open the HTML file in mams-server/data/mail-outbox/`,
          'success'
        );
      } else if (created.emailSent) {
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
        {mailEnabled ? (
          <p className="text-sm text-text-muted bg-surface2 border border-border rounded-md px-3 py-2">
            A branded welcome email with sign-in instructions and the temporary password will be sent to the email address below.
          </p>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
            Email is not configured on the server. You must share the temporary password with the new user manually.
          </p>
        )}
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
            <option value="org.admin">Organization Admin</option>
            <option value="hr.admin">HR Admin (real view)</option>
            <option value="hr.compliance">Compliance Auditor (compliant view)</option>
            <option value="it.admin">IT Admin</option>
          </Select>
        </Field>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['HR Admin standard', 'hr.admin'],
              ['Compliance reviewer', 'hr.compliance'],
              ['IT only', 'it.admin'],
            ] as const
          ).map(([label, r]) => (
            <button
              key={r}
              type="button"
              className="btn-outline btn-sm"
              onClick={() => {
                setRole(r);
                setSelectedPerms([...PERMISSIONS_BY_ROLE[r]].filter((p) => p !== 'unmask.sensitive'));
                if (r !== 'hr.admin') setUnmaskFieldGrants([]);
              }}
            >
              {label}
            </button>
          ))}
        </div>
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
  const [mustChangePassword, setMustChangePassword] = useState(false);
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
    setMustChangePassword(user.mustChangePassword ?? false);
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
        mustChangePassword,
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
          : 'User updated. Previous sessions for this user were ended; they must sign in again.',
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
  const roleDefaults = PERMISSIONS_BY_ROLE[role].filter((p) => p !== 'unmask.sensitive');
  const defaultSet = new Set<string>(roleDefaults);
  const selectedSet = new Set<string>(selectedPerms);
  const permissionsAdded = selectedPerms.filter((p) => !defaultSet.has(p));
  const permissionsRemoved = roleDefaults.filter((p) => !selectedSet.has(p));

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
                <option value="org.admin">Organization Admin</option>
            <option value="hr.admin">HR Admin (real view)</option>
                <option value="hr.compliance">Compliance Auditor (compliant view)</option>
                <option value="it.admin">IT Admin</option>
              </Select>
            </Field>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm font-medium">Force password change on next login</span>
              <Toggle checked={mustChangePassword} onChange={setMustChangePassword} />
            </div>
            {(permissionsAdded.length > 0 || permissionsRemoved.length > 0) && (
              <div className="rounded-md border border-border bg-surface2/50 p-3 text-xs space-y-1">
                <div className="font-semibold uppercase tracking-wider text-text-muted">Permission diff vs role default</div>
                {permissionsAdded.length > 0 && (
                  <div><span className="text-green font-medium">Added:</span> {permissionsAdded.map((p) => PERMISSION_LABELS[p]).join(', ')}</div>
                )}
                {permissionsRemoved.length > 0 && (
                  <div><span className="text-red font-medium">Removed:</span> {permissionsRemoved.map((p) => PERMISSION_LABELS[p]).join(', ')}</div>
                )}
              </div>
            )}
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
