import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { isUnmaskEnabled } from '../config/featureFlags.js';
import { env } from '../config/env.js';
import { DeviceModel } from '../models/Device.js';
import { audit } from '../services/audit.service.js';

const router = Router();
router.use(requireAuth);

router.get('/health', requirePermission('read.system_health'), async (_req, res, next) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbConnected = dbState === 1;
    const [deviceTotal, deviceOnline] = await Promise.all([
      DeviceModel.countDocuments({ isActive: true }),
      DeviceModel.countDocuments({
        isActive: true,
        lastPingAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
      }),
    ]);
    res.json({
      api: 'ok',
      dbConnected,
      dbState,
      version: process.env.npm_package_version ?? 'dev',
      timezone: env.TZ ?? 'Asia/Kolkata',
      devices: { total: deviceTotal, online: deviceOnline, offline: deviceTotal - deviceOnline },
      ts: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

const FeatureFlagsPatchSchema = z.object({
  unmaskEnabled: z.boolean().optional(),
  autogenDemoEnabled: z.boolean().optional(),
});

router.get('/feature-flags', requirePermission('manage.feature_flags'), (_req, res) => {
  res.json({
    unmaskEnabled: isUnmaskEnabled(),
    autogenDemoEnabled: process.env.FEATURE_AUTOGEN_DEMO_ENABLED !== 'false',
    note: 'Runtime toggles require server restart or env update in production deployments.',
  });
});

router.patch('/feature-flags', requirePermission('manage.feature_flags'), async (req, res, next) => {
  try {
    const body = FeatureFlagsPatchSchema.parse(req.body);
    const changed: Record<string, boolean> = {};
    if (body.unmaskEnabled !== undefined) {
      process.env.FEATURE_UNMASK_ENABLED = body.unmaskEnabled ? 'true' : 'false';
      changed.unmaskEnabled = body.unmaskEnabled;
    }
    if (body.autogenDemoEnabled !== undefined) {
      process.env.FEATURE_AUTOGEN_DEMO_ENABLED = body.autogenDemoEnabled ? 'true' : 'false';
      changed.autogenDemoEnabled = body.autogenDemoEnabled;
    }
    await audit(
      'feature_flags_changed',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'settings', payload: changed }
    );
    res.json({
      unmaskEnabled: isUnmaskEnabled(),
      autogenDemoEnabled: process.env.FEATURE_AUTOGEN_DEMO_ENABLED !== 'false',
      changed,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
