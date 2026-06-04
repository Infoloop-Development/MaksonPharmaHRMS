import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { UserModel, type UserDoc } from '../models/User.js';
import { RefreshTokenModel } from '../models/RefreshToken.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from './audit.service.js';
import mongoose from 'mongoose';
import type { Permission, Role } from '@mams/types';
import { PasswordSchema } from '../utils/passwordPolicy.js';

export { PERMISSIONS_BY_ROLE } from '@mams/types';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function login(email: string, password: string, ctx: { ipAddress: string | null; userAgent: string | null }) {
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user || !user.isActive) {
    await audit('login_failed', { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent }, { payload: { email, reason: 'unknown_or_inactive' } });
    throw new ApiError(401, 'invalid_credentials', 'Invalid email or password');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ApiError(423, 'account_locked', 'Account is temporarily locked. Try again in 15 minutes.');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    user.failedLoginCount = (user.failedLoginCount ?? 0) + 1;
    if (user.failedLoginCount >= LOCKOUT_THRESHOLD) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }
    await user.save();
    await audit('login_failed', { userId: user._id, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent }, { payload: { reason: 'bad_password', failedCount: user.failedLoginCount } });
    throw new ApiError(401, 'invalid_credentials', 'Invalid email or password');
  }

  user.failedLoginCount = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken({
    sub: String(user._id),
    role: user.role as Role,
    viewMode: user.viewMode as 'real' | 'compliant',
    permissions: (user.permissions ?? []) as Permission[],
  });
  const refreshToken = signRefreshToken(String(user._id));
  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    issuedFromIp: ctx.ipAddress,
  });

  await audit('login', { userId: user._id, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
  return { user, accessToken, refreshToken };
}

export async function rotateRefresh(token: string, ctx: { ipAddress: string | null }) {
  const decoded = verifyRefreshToken(token);
  const tokenHash = hashToken(token);
  const stored = await RefreshTokenModel.findOne({ tokenHash, revokedAt: null });
  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError(401, 'invalid_refresh_token', 'Refresh token invalid or expired');
  }
  // Revoke the used token (single-use rotation).
  stored.revokedAt = new Date();
  await stored.save();

  const user = await UserModel.findById(decoded.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'invalid_refresh_token', 'User no longer active');
  }

  const accessToken = signAccessToken({
    sub: String(user._id),
    role: user.role as Role,
    viewMode: user.viewMode as 'real' | 'compliant',
    permissions: (user.permissions ?? []) as Permission[],
  });
  const refreshToken = signRefreshToken(String(user._id));
  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    rotatedFromTokenHash: tokenHash,
    issuedFromIp: ctx.ipAddress,
  });

  return { user, accessToken, refreshToken };
}

export async function logout(refreshToken: string): Promise<void> {
  await RefreshTokenModel.updateOne(
    { tokenHash: hashToken(refreshToken) },
    { $set: { revokedAt: new Date() } }
  );
}

export function userPublic(user: UserDoc) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    viewMode: user.viewMode,
    permissions: user.permissions ?? [],
    isActive: user.isActive ?? true,
    mustChangePassword: user.mustChangePassword ?? false,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  ctx: { ipAddress: string | null; userAgent: string | null }
) {
  const parsedNew = PasswordSchema.safeParse(newPassword);
  if (!parsedNew.success) {
    throw new ApiError(400, 'invalid_password', parsedNew.error.issues[0]?.message ?? 'Invalid password');
  }
  if (currentPassword === newPassword) {
    throw new ApiError(400, 'same_password', 'New password must be different from your current password');
  }

  const user = await UserModel.findById(userId);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'unauthorized', 'User not found or inactive');
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    throw new ApiError(401, 'invalid_credentials', 'Current password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  await user.save();

  await RefreshTokenModel.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  await audit('password_changed', {
    userId: user._id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return user;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Revokes all refresh sessions for user (forces re-login after issuance of new tokens). */
export async function revokeRefreshTokensForUser(userId: string): Promise<void> {
  await RefreshTokenModel.updateMany(
    { userId: new mongoose.Types.ObjectId(userId), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}
