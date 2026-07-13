import type { Permission, Role } from './user.js';

export function canViewLeave(permissions: Permission[]): boolean {
  return (
    permissions.includes('read.leave') ||
    permissions.includes('write.leave') ||
    permissions.includes('approve.leave') ||
    permissions.includes('manage.leave')
  );
}

export function canWriteLeave(permissions: Permission[]): boolean {
  return permissions.includes('write.leave') || permissions.includes('manage.leave');
}

export function canApproveLeave(permissions: Permission[]): boolean {
  return permissions.includes('approve.leave') || permissions.includes('manage.leave');
}

export function canConfigureLeave(permissions: Permission[]): boolean {
  return permissions.includes('manage.leave');
}

export function canViewVisitors(permissions: Permission[]): boolean {
  return (
    permissions.includes('read.visitors') ||
    permissions.includes('approve.visitors') ||
    permissions.includes('manage.visitors')
  );
}

export function canApproveVisitors(permissions: Permission[]): boolean {
  return permissions.includes('approve.visitors') || permissions.includes('manage.visitors');
}

export function canManageVisitorForms(permissions: Permission[]): boolean {
  return permissions.includes('manage.visitors');
}

export function canManageOrgUsers(permissions: Permission[]): boolean {
  return permissions.includes('manage.org_users') || permissions.includes('manage.users');
}

export function canManageOrgSettings(permissions: Permission[]): boolean {
  return permissions.includes('manage.org_settings') || permissions.includes('manage.settings');
}

export function canManageEmployees(permissions: Permission[]): boolean {
  return permissions.includes('manage.employees') || permissions.includes('manage.users');
}

export function isOrgAdminRole(role: Role): boolean {
  return role === 'org.admin';
}

export function isItAdminRole(role: Role): boolean {
  return role === 'it.admin';
}

export function hasOrgAdminLikeAccess(role: Role): boolean {
  return role === 'org.admin' || role === 'it.admin';
}

export function defaultHomePath(role: Role): '/admin' | '/dashboard' {
  return hasOrgAdminLikeAccess(role) ? '/admin' : '/dashboard';
}

/** Resolve whether a leave application should be auto-approved on create. */
export function resolveLeaveAdminApply(
  permissions: Permission[],
  requestedAdminApply: boolean
): { adminApply: boolean } | { error: 'forbidden' } {
  const mayAutoApprove = canApproveLeave(permissions);
  if (requestedAdminApply && !mayAutoApprove) {
    return { error: 'forbidden' };
  }
  return { adminApply: mayAutoApprove && requestedAdminApply };
}
