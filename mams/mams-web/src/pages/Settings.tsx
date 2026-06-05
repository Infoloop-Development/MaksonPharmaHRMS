import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type Settings as SettingsT } from '../api/settings';
import { ApiError } from '../api/client';
import { usersApi, type UserSummary } from '../api/users';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Select, Textarea, Toggle } from '../components/ui/Field';
import { fmtIstTime } from '../lib/format';
import type { Permission, Role, UserPublic } from '@mams/types';
import { PERMISSIONS_BY_ROLE, ROLE_PERMISSION_CAP } from '@mams/types';
import { z } from 'zod';
import { ActivityLogPanel } from '../components/activity/ActivityLogPanel';
import { ACTIVITY_QUERY_KEY } from '../api/activity';

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
  'write.adjust': 'Create/edit attendance adjustments',
  'approve.adjust': 'Approve/reject adjustments',
  'unmask.sensitive': 'Unmask PAN, bank, Aadhaar, PF, ESI',
  'manage.users': 'Manage users',
  'manage.devices': 'Manage biometric devices',
  'manage.settings': 'Manage settings',
};
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
  const canManageUsers = user?.permissions.includes('manage.users') ?? false;

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  if (isLoading) return <div className="text-text-muted">Loading...</div>;
  if (!data) return <div className="text-red">Failed to load settings.</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="text-sm text-text-muted">
          {canManage ? 'Edits are audit-logged.' : 'Read-only view (you do not have manage.settings permission).'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CompanyInfoCard settings={data} canManage={canManage} />
        <ComplianceCard settings={data} canManage={canManage} />
        <ShiftsCard settings={data} canManage={canManage} />
        <SmartAnchorCard settings={data} canManage={canManage} />
        <ConfidentialityCard settings={data} canManage={canManage} />
        {canManageUsers && <UsersCard />}
      </div>

      <div className="mt-6">
        <SectionCard title="Activity">
          <ActivityLogPanel />
        </SectionCard>
      </div>
    </div>
  );
}

function invalidateActivity(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEY });
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
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-bold">{title}</h2>
        {headerRight}
      </div>
      <div className="space-y-3">{children}</div>
      {footer && <div className="mt-4 pt-4 border-t border-border flex justify-end gap-2">{footer}</div>}
    </div>
  );
}

function EditSectionIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="shrink-0 p-1.5 rounded-md text-text-muted hover:text-primary hover:bg-surface2 -mt-0.5"
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
  return (
    <SectionCard title="Time Shifts">
      <div>
        <div className="text-xs uppercase tracking-wider text-text-subtle mb-2">Real shifts (12-hour)</div>
        {settings.realShifts.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="font-medium">{s.label}</span>
            <span className="font-mono text-sm">{s.start} - {s.end}</span>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-border">
        <div className="text-xs uppercase tracking-wider text-text-subtle mb-2">Compliance shifts (8-hour)</div>
        {settings.complianceShifts.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="font-medium">{s.label}</span>
            <span className="font-mono text-sm">{s.start} - {s.end}</span>
          </div>
        ))}
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
      <div className="flex items-center justify-between py-2">
        <div>
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
      <div className="flex items-center justify-between">
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
      <div className="tbl-scroll">
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
                    className="btn-outline text-xs px-2 py-1"
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
      size="md"
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
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="hr.admin">HR Admin (real view)</option>
            <option value="hr.compliance">Compliance Auditor (compliant view)</option>
            <option value="it.admin">IT Admin</option>
          </Select>
        </Field>
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
    setSelectedPerms(p);
    setIsActive(user.isActive);
  }, [user]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (selfMode) {
        return usersApi.patch(user._id, { name: name.trim(), email: email.trim().toLowerCase() });
      }
      return usersApi.patch(user._id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        permissions: selectedPerms,
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
      size="md"
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
                  setSelectedPerms([...PERMISSIONS_BY_ROLE[r]]);
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
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">Permissions</div>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-md p-3">
                {cap.map((p) => (
                  <label key={p} className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={selectedPerms.includes(p)}
                      onChange={() => togglePerm(p)}
                    />
                    <span>{PERMISSION_LABELS[p]}</span>
                  </label>
                ))}
              </div>
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
