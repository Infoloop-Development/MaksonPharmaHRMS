import type { Permission } from '@mams/types';
import {
  ALL_SENSITIVE_UNMASK_FIELDS,
  dedupeUnmaskFieldGrants,
  type SensitiveUnmaskField,
} from '@mams/types';
import type { UserDoc } from '../models/User.js';
import { isUnmaskEnabled } from '../config/featureFlags.js';

export function effectiveUnmaskFieldGrants(user: {
  unmaskFieldGrants?: string[] | null;
  permissions?: string[] | null;
}): SensitiveUnmaskField[] {
  if (!isUnmaskEnabled()) return [];
  const grants = dedupeUnmaskFieldGrants((user.unmaskFieldGrants ?? []) as SensitiveUnmaskField[]);
  if (grants.length > 0) return grants;
  const perms = user.permissions ?? [];
  if (perms.includes('unmask.sensitive')) {
    return [...ALL_SENSITIVE_UNMASK_FIELDS];
  }
  return [];
}

export function userHasUnmaskGrant(user: UserDoc, field: SensitiveUnmaskField): boolean {
  if (!isUnmaskEnabled()) return false;
  return effectiveUnmaskFieldGrants(user).includes(field);
}

export function applyUnmaskSensitivePermission(
  permissions: Permission[],
  grants: SensitiveUnmaskField[]
): Permission[] {
  const without = permissions.filter((p) => p !== 'unmask.sensitive');
  if (grants.length > 0) {
    return [...without, 'unmask.sensitive'];
  }
  return without;
}
