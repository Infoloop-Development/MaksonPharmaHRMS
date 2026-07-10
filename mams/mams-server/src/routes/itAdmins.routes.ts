import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ItAdminCreateBodySchema, permissionsForDelegatedItAdmin } from '@mams/types';
import { UserModel } from '../models/User.js';
import { requireAuth, requireAnyPermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.service.js';
import { generateSecurePassword } from '../utils/generateSecurePassword.js';

const router = Router();
router.use(requireAuth);
const manageUsersGate = requireAnyPermission('manage.org_users', 'manage.users');

router.get('/', manageUsersGate, async (_req, res, next) => {
  try {
    const items = await UserModel.find({ role: 'it.admin' })
      .select('-passwordHash')
      .sort({ createdAt: 1 })
      .lean();
    res.json({
      items: items.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        isActive: u.isActive ?? true,
        createdAt: (u as { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', manageUsersGate, async (req, res, next) => {
  try {
    const body = ItAdminCreateBodySchema.parse(req.body);
    const exists = await UserModel.findOne({ email: body.email });
    if (exists) throw new ApiError(409, 'duplicate_email', 'A user with this email already exists');

    const initialPassword = generateSecurePassword();
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const permissions = permissionsForDelegatedItAdmin();

    const created = await UserModel.create({
      email: body.email,
      passwordHash,
      name: body.name,
      role: 'it.admin',
      viewMode: 'real',
      permissions,
      unmaskFieldGrants: [],
      isActive: true,
      mustChangePassword: true,
    });

    await audit(
      'it_admin_created',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      {
        entityType: 'user',
        entityId: created._id,
        payload: {
          email: created.email,
          role: created.role,
          delegated: true,
          permissions: created.permissions,
        },
      }
    );

    res.status(201).json({
      id: String(created._id),
      name: created.name,
      email: created.email,
      isActive: created.isActive ?? true,
      createdAt: created.createdAt?.toISOString() ?? new Date().toISOString(),
      initialPassword,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
