import type { Permission } from '@mams/types';

function parseEnabled(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no') return false;
  return true;
}

/** When false, unmask API, grants UI, and session unmask permission are disabled (demo mode). Default: true. */
export function isUnmaskEnabled(): boolean {
  return parseEnabled(process.env.FEATURE_UNMASK_ENABLED);
}

export function filterPermissionsForSession(permissions: Permission[]): Permission[] {
  if (isUnmaskEnabled()) return permissions;
  return permissions.filter((p) => p !== 'unmask.sensitive');
}
