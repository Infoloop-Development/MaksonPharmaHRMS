import type { Permission, Role } from './user.js';

/** Default permission set assigned when creating a user for a role. */
export const PERMISSIONS_BY_ROLE: Record<Role, Permission[]> = {
  'hr.admin': ['read.real', 'write.adjust', 'unmask.sensitive', 'manage.users', 'manage.devices', 'manage.settings'],
  'hr.compliance': ['read.compliant', 'approve.adjust'],
  'it.admin': ['read.real', 'manage.users', 'manage.devices', 'manage.settings'],
};

/** Maximum permissions assignable per role (PATCH validation + Settings UI caps). */
export const ROLE_PERMISSION_CAP: Record<Role, readonly Permission[]> = {
  'hr.admin': [
    'read.real',
    'read.compliant',
    'write.adjust',
    'approve.adjust',
    'unmask.sensitive',
    'manage.users',
    'manage.devices',
    'manage.settings',
  ],
  'hr.compliance': ['read.compliant', 'approve.adjust'],
  'it.admin': ['read.real', 'manage.users', 'manage.devices', 'manage.settings'],
};

const capSets: Record<Role, Set<string>> = {
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

export function hasManageUsersPermission(permissions: Permission[]): boolean {
  return permissions.includes('manage.users');
}
