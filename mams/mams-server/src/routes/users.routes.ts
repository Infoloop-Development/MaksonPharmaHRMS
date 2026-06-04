import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import { UserModel } from '../models/User.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.service.js';
import { revokeRefreshTokensForUser, userPublic } from '../services/auth.service.js';
import { sendWelcomeUserEmail } from '../services/mail.service.js';
import { isMailEnabled } from '../config/mail.js';
import type { Permission, Role } from '@mams/types';
import {
  PERMISSIONS_BY_ROLE,
  RoleSchema,
  UserUpdateBodySchema,
  validatePermissionsForRole,
} from '@mams/types';
import { PasswordSchema } from '../utils/passwordPolicy.js';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('manage.users'), async (_req, res, next) => {
  try {
    const items = await UserModel.find().select('-passwordHash').sort({ createdAt: 1 }).lean();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

function permissionsEqual(a: Permission[], b: Permission[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

async function assertLeavingAtLeastOneOtherManageUser(
  targetId: string,
  nextPerms: Permission[],
  nextActive: boolean
): Promise<void> {
  const stillHolds = nextActive && nextPerms.includes('manage.users');
  if (stillHolds) return;

  const oid = new mongoose.Types.ObjectId(targetId);
  const others = await UserModel.countDocuments({
    _id: { $ne: oid },
    isActive: true,
    permissions: 'manage.users',
  });
  if (others < 1) {
    throw new ApiError(
      400,
      'last_manage_user',
      'At least one other active user must retain manage.users permission.'
    );
  }
}

function viewModeForRole(role: Role): 'real' | 'compliant' {
  return role === 'hr.compliance' ? 'compliant' : 'real';
}

const UserCreateSchema = z.object({
  email: z.string().trim().pipe(z.string().email()).transform((s) => s.toLowerCase()),
  name: z.string().trim().min(1).max(120),
  role: RoleSchema,
  password: PasswordSchema,
});

router.post('/', requirePermission('manage.users'), async (req, res, next) => {
  try {
    const body = UserCreateSchema.parse(req.body);
    const exists = await UserModel.findOne({ email: body.email });
    if (exists) throw new ApiError(409, 'duplicate_email', 'A user with this email already exists');

    const passwordHash = await bcrypt.hash(body.password, 10);
    const viewMode = viewModeForRole(body.role);
    const created = await UserModel.create({
      email: body.email,
      passwordHash,
      name: body.name,
      role: body.role,
      viewMode,
      permissions: [...PERMISSIONS_BY_ROLE[body.role]],
      isActive: true,
      mustChangePassword: true,
    });

    await audit(
      'user_created',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'user', entityId: created._id, payload: { email: created.email, role: created.role } }
    );

    let emailSent = false;
    let emailError: string | undefined;
    if (isMailEnabled()) {
      const mailResult = await sendWelcomeUserEmail({
        to: created.email,
        name: created.name,
        role: created.role as Role,
        email: created.email,
        password: body.password,
      });
      if (mailResult.ok) {
        emailSent = true;
      } else {
        emailError = mailResult.error;
        await audit(
          'welcome_email_failed',
          { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
          { entityType: 'user', entityId: created._id, payload: { email: created.email, reason: mailResult.error } }
        );
      }
    }

    const { passwordHash: _, ...safe } = created.toObject();
    res.status(201).json({ ...safe, emailSent, ...(emailError ? { emailError } : {}) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requirePermission('manage.users'), async (req, res, next) => {
  try {
    const rawId = req.params.id ?? '';
    if (!mongoose.isValidObjectId(rawId)) {
      throw new ApiError(404, 'not_found', 'User not found');
    }

    const body = UserUpdateBodySchema.parse(req.body);
    const actorId = req.auth!.sub;
    const targetIdStr = rawId;
    const isSelf = actorId === targetIdStr;

    if (isSelf) {
      if (body.role !== undefined || body.permissions !== undefined || body.isActive !== undefined) {
        throw new ApiError(403, 'forbidden', 'You cannot change your own role, permissions, or status');
      }

      const user = await UserModel.findById(targetIdStr);
      if (!user) throw new ApiError(404, 'not_found', 'User not found');

      if (body.email !== undefined && body.email !== user.email) {
        const taken = await UserModel.findOne({ email: body.email, _id: { $ne: user._id } });
        if (taken) throw new ApiError(409, 'duplicate_email', 'A user with this email already exists');
        user.email = body.email;
      }
      if (body.name !== undefined) user.name = body.name;

      await user.save();
      await audit(
        'user_updated',
        { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
        { entityType: 'user', entityId: user._id, payload: { self: true, emailChanged: body.email !== undefined } }
      );

      return res.json({ user: userPublic(user) });
    }

    const user = await UserModel.findById(targetIdStr);
    if (!user) throw new ApiError(404, 'not_found', 'User not found');

    const prevRole = user.role as Role;
    const prevPerms = (user.permissions ?? []) as Permission[];
    const prevActive = user.isActive ?? true;

    let nextRole: Role = body.role ?? prevRole;
    let nextPermissions: Permission[];

    if (body.role !== undefined && body.permissions !== undefined) {
      const validated = validatePermissionsForRole(body.role, body.permissions as Permission[]);
      if (!validated.ok) throw new ApiError(400, 'invalid_permissions', validated.message);
      nextRole = body.role;
      nextPermissions = validated.permissions;
    } else if (body.role !== undefined && body.permissions === undefined) {
      nextRole = body.role;
      nextPermissions = [...PERMISSIONS_BY_ROLE[body.role]];
    } else if (body.role === undefined && body.permissions !== undefined) {
      const validated = validatePermissionsForRole(prevRole, body.permissions as Permission[]);
      if (!validated.ok) throw new ApiError(400, 'invalid_permissions', validated.message);
      nextPermissions = validated.permissions;
    } else {
      nextPermissions = [...prevPerms];
    }

    const nextActive = body.isActive !== undefined ? body.isActive : prevActive;

    await assertLeavingAtLeastOneOtherManageUser(targetIdStr, nextPermissions, nextActive);

    if (body.email !== undefined && body.email !== user.email) {
      const taken = await UserModel.findOne({ email: body.email, _id: { $ne: user._id } });
      if (taken) throw new ApiError(409, 'duplicate_email', 'A user with this email already exists');
      user.email = body.email;
    }
    if (body.name !== undefined) user.name = body.name;

    user.role = nextRole;
    user.viewMode = viewModeForRole(nextRole);
    user.permissions = nextPermissions;
    user.isActive = nextActive;

    await user.save();

    const rbacOrStatusChanged =
      body.role !== undefined || body.permissions !== undefined || body.isActive !== undefined;

    const permissionsActuallyChanged =
      rbacOrStatusChanged &&
      (!permissionsEqual(prevPerms, nextPermissions) || prevRole !== nextRole || prevActive !== nextActive);

    if (rbacOrStatusChanged) {
      await revokeRefreshTokensForUser(targetIdStr);
    }

    await audit(
      'user_updated',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      {
        entityType: 'user',
        entityId: user._id,
        payload: {
          email: body.email !== undefined,
          role: body.role !== undefined,
          isActive: body.isActive !== undefined,
          permissionsChanged: permissionsActuallyChanged,
        },
      }
    );

    const fresh = await UserModel.findById(user._id).select('-passwordHash').lean();
    return res.json(fresh);
  } catch (err) {
    next(err);
  }
});

export default router;
