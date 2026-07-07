import type { Request, Response, NextFunction } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Permission, Role, ViewMode } from '@mams/types';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { filterPermissionsForSession } from '../config/featureFlags.js';

export interface AuthClaims {
  sub: string;        // userId
  role: Role;
  viewMode: ViewMode;
  permissions: Permission[];
  iat: number;
  exp: number;
}

declare global {
  // Augment Express Request to carry auth context
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthClaims;
    }
  }
}

// jsonwebtoken's `expiresIn` is typed as a narrow union ("15m" | number | etc.)
// We accept any duration string from env; cast here instead of plumbing the
// union all the way through the env schema.
const ACCESS_OPTS: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn'] };
const REFRESH_OPTS: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES as SignOptions['expiresIn'] };

export function signAccessToken(claims: Omit<AuthClaims, 'iat' | 'exp'>): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, ACCESS_OPTS);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, kind: 'refresh' }, env.JWT_REFRESH_SECRET, REFRESH_OPTS);
}

export function verifyRefreshToken(token: string): { sub: string } {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; kind: string };
  if (decoded.kind !== 'refresh') throw new Error('Not a refresh token');
  return { sub: decoded.sub };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }
  const token = header.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthClaims;
    const user = await UserModel.findById(decoded.sub)
      .select('isActive role viewMode permissions')
      .lean();
    if (!user || user.isActive === false) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    req.auth = {
      sub: String(user._id),
      role: user.role as Role,
      viewMode: user.viewMode as ViewMode,
      permissions: filterPermissionsForSession((user.permissions ?? []) as Permission[]),
      iat: decoded.iat,
      exp: decoded.exp,
    };
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    if (!req.auth.permissions.includes(permission)) {
      res.status(403).json({ error: 'forbidden', requiredPermission: permission });
      return;
    }
    next();
  };
}

export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    if (!permissions.some((p) => req.auth!.permissions.includes(p))) {
      res.status(403).json({ error: 'forbidden', requiredPermissions: permissions });
      return;
    }
    next();
  };
}
