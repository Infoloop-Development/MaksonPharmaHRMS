import { Router } from 'express';
import { ChangePasswordRequestSchema, LoginRequestSchema, RefreshRequestSchema } from '@mams/types';
import { UserModel } from '../models/User.js';
import { changePassword, login, logout, rotateRefresh, userPublic } from '../services/auth.service.js';
import { PasswordSchema } from '../utils/passwordPolicy.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const body = LoginRequestSchema.parse(req.body);
    const result = await login(body.email, body.password, {
      ipAddress: req.clientIp ?? null,
      userAgent: req.header('user-agent') ?? null,
    });
    res.json({
      user: userPublic(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const body = RefreshRequestSchema.parse(req.body);
    const result = await rotateRefresh(body.refreshToken, { ipAddress: req.clientIp ?? null });
    res.json({
      user: userPublic(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const body = RefreshRequestSchema.parse(req.body);
    await logout(body.refreshToken);
    if (req.auth) {
      await audit('logout', {
        userId: req.auth.sub,
        ipAddress: req.clientIp ?? null,
        userAgent: req.header('user-agent') ?? null,
      });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const doc = await UserModel.findById(req.auth!.sub);
    if (!doc || !(doc.isActive ?? true)) {
      return res.status(401).json({ error: 'session_invalid', message: 'Account is inactive or unavailable' });
    }
    res.json({ auth: req.auth, user: userPublic(doc) });
  } catch (err) {
    next(err);
  }
});

const ChangePasswordBodySchema = ChangePasswordRequestSchema.extend({
  newPassword: PasswordSchema,
});

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const body = ChangePasswordBodySchema.parse(req.body);
    const user = await changePassword(req.auth!.sub, body.currentPassword, body.newPassword, {
      ipAddress: req.clientIp ?? null,
      userAgent: req.header('user-agent') ?? null,
    });
    res.json({ user: userPublic(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
