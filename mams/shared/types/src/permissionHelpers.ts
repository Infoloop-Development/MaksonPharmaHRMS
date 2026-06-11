import type { Permission } from './user.js';

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

export function canWriteRegularization(permissions: Permission[]): boolean {
  return permissions.includes('write.regularization');
}

export function canApproveRegularization(permissions: Permission[]): boolean {
  return permissions.includes('approve.regularization');
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
