import type { Permission, Role } from './user.js';
import { dedupeUnmaskFieldGrants, type SensitiveUnmaskField } from './sensitiveUnmask.js';

const HR_OPERATIONAL: Permission[] = [
  'read.real',
  'read.compliant',
  'write.adjust',
  'approve.adjust',
  'write.regularization',
  'approve.regularization',
  'unmask.sensitive',
  'manage.employees',
  'manage.devices',
  'read.leave',
  'write.leave',
  'approve.leave',
  'manage.leave',
  'read.visitors',
  'approve.visitors',
  'manage.visitors',
];

const ORG_GOVERNANCE: Permission[] = [
  'manage.org_users',
  'manage.org_settings',
  'manage.security',
  'read.org_audit',
  'manage.feature_flags',
  'read.system_health',
  'manage.export_naming',
];

const ORG_ADMIN_CAP: Permission[] = [
  ...ORG_GOVERNANCE,
  ...HR_OPERATIONAL,
  'manage.settings',
  'manage.users',
];

/** Default permission set assigned when creating a user for a role. */
export const PERMISSIONS_BY_ROLE: Record<Role, Permission[]> = {
  'org.admin': [...ORG_GOVERNANCE, ...HR_OPERATIONAL],
  'hr.admin': [
    'read.real',
    'write.adjust',
    'write.regularization',
    'approve.regularization',
    'unmask.sensitive',
    'manage.employees',
    'manage.devices',
    'manage.leave',
    'read.visitors',
    'approve.visitors',
    'manage.visitors',
    'read.compliance_activity',
    'approve.employee_change',
  ],
  'hr.compliance': [
    'read.compliant',
    'approve.adjust',
    'approve.regularization',
    'approve.leave',
    'read.leave',
    'read.visitors',
    'approve.visitors',
    'write.employee_change',
  ],
  'it.admin': [...ORG_GOVERNANCE, ...HR_OPERATIONAL, 'manage.recycle_bin', 'manage.bug_reports'],
};

/** Maximum permissions assignable per role (PATCH validation + Settings UI caps). */
export const ROLE_PERMISSION_CAP: Record<Role, readonly Permission[]> = {
  'org.admin': ORG_ADMIN_CAP,
  'hr.admin': [
    'read.real',
    'read.compliant',
    'write.adjust',
    'approve.adjust',
    'write.regularization',
    'approve.regularization',
    'unmask.sensitive',
    'manage.employees',
    'manage.devices',
    'read.leave',
    'write.leave',
    'approve.leave',
    'manage.leave',
    'read.visitors',
    'approve.visitors',
    'manage.visitors',
    'read.compliance_activity',
    'approve.employee_change',
  ],
  'hr.compliance': [
    'read.compliant',
    'approve.adjust',
    'approve.regularization',
    'approve.leave',
    'read.leave',
    'read.visitors',
    'approve.visitors',
    'write.employee_change',
  ],
  'it.admin': [...ORG_ADMIN_CAP, 'manage.recycle_bin', 'manage.bug_reports'],
};

const capSets: Record<Role, Set<string>> = {
  'org.admin': new Set(ROLE_PERMISSION_CAP['org.admin']),
  'hr.admin': new Set(ROLE_PERMISSION_CAP['hr.admin']),
  'hr.compliance': new Set(ROLE_PERMISSION_CAP['hr.compliance']),
  'it.admin': new Set(ROLE_PERMISSION_CAP['it.admin']),
};

/** Dedupe preserving first-seen order. */
export function dedupePermissions(permissions: Permission[]): Permission[] {
  const seen = new Set<string>();
  const out: Permission[] = [];
  for (const p of permissions) {
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

/**
 * Validates that `permissions` is non-empty and every entry lies in ROLE_PERMISSION_CAP[role].
 */
export function validatePermissionsForRole(
  role: Role,
  permissions: Permission[]
): { ok: true; permissions: Permission[] } | { ok: false; message: string } {
  const deduped = dedupePermissions(permissions);
  if (deduped.length < 1) {
    return { ok: false, message: 'At least one permission is required' };
  }
  const cap = capSets[role];
  for (const p of deduped) {
    if (!cap.has(p)) {
      return { ok: false, message: `Permission "${p}" is not allowed for role ${role}` };
    }
  }
  return { ok: true, permissions: deduped };
}

export function hasManageOrgUsersPermission(permissions: Permission[]): boolean {
  return permissions.includes('manage.org_users') || permissions.includes('manage.users');
}

/** @deprecated Use hasManageOrgUsersPermission */
export function hasManageUsersPermission(permissions: Permission[]): boolean {
  return hasManageOrgUsersPermission(permissions);
}

export function canAccessAdminConsole(role: Role, permissions: Permission[]): boolean {
  return (
    role === 'org.admin' ||
    role === 'it.admin' ||
    permissions.includes('manage.org_users') ||
    permissions.includes('manage.org_settings') ||
    permissions.includes('read.org_audit') ||
    permissions.includes('manage.security') ||
    permissions.includes('manage.feature_flags') ||
    permissions.includes('read.system_health')
  );
}

export function canManageRecycleBin(permissions: Permission[]): boolean {
  return permissions.includes('manage.recycle_bin');
}

export function canManageBugReports(permissions: Permission[]): boolean {
  return permissions.includes('manage.bug_reports');
}

/** Base role permissions with unmask.sensitive only when HR Admin has at least one field grant. */
export function permissionsWithUnmaskGrants(
  role: Role,
  unmaskFieldGrants: SensitiveUnmaskField[]
): Permission[] {
  const base = [...PERMISSIONS_BY_ROLE[role]];
  const grants = dedupeUnmaskFieldGrants(unmaskFieldGrants);
  const without = base.filter((p) => p !== 'unmask.sensitive');
  if (role === 'hr.admin' && grants.length > 0) {
    return dedupePermissions([...without, 'unmask.sensitive']);
  }
  return without;
}

export function canRoleHaveUnmaskFieldGrants(role: Role): boolean {
  return role === 'hr.admin';
}
