import { PERMISSIONS_BY_ROLE, dedupePermissions, type Permission, type Role } from '@mams/types';
import { UserModel, type UserDoc } from '../models/User.js';
import { logger } from '../utils/logger.js';

/**
 * Add any role-default permissions missing from the user document.
 * Keeps custom permission sets intact while picking up newly introduced role defaults.
 */
export async function ensureUserRoleDefaultPermissions(user: UserDoc): Promise<UserDoc> {
  const role = user.role as Role;
  const defaults = PERMISSIONS_BY_ROLE[role] ?? [];
  const current = (user.permissions ?? []) as Permission[];
  const missing = defaults.filter((p) => !current.includes(p));
  if (missing.length === 0) return user;

  user.permissions = dedupePermissions([...current, ...missing]);
  await user.save();
  logger.info('Backfilled missing role default permissions', {
    userId: String(user._id),
    email: user.email,
    role,
    added: missing,
  });
  return user;
}

/** Startup migration: backfill all active users. Returns count of updated users. */
export async function backfillAllUsersRoleDefaultPermissions(): Promise<number> {
  const users = await UserModel.find({ isActive: { $ne: false } });
  let updated = 0;
  for (const user of users) {
    const before = JSON.stringify(user.permissions ?? []);
    await ensureUserRoleDefaultPermissions(user);
    if (JSON.stringify(user.permissions ?? []) !== before) updated += 1;
  }
  if (updated > 0) {
    logger.info('Role permission backfill complete', { updatedUsers: updated });
  }
  return updated;
}
