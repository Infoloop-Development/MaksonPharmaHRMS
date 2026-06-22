import { Router } from 'express';
import mongoose from 'mongoose';
import { FeatureFlagsPatchSchema } from '@mams/types';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { DeviceModel } from '../models/Device.js';
import { getFeatureFlagsResponse, patchFeatureFlags } from '../services/featureFlags.service.js';

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

const FeatureFlagsPatchSchemaLegacy = FeatureFlagsPatchSchema;

router.get('/feature-flags', requirePermission('manage.feature_flags'), async (_req, res, next) => {
  try {
    res.json(await getFeatureFlagsResponse());
  } catch (err) {
    next(err);
  }
});

router.patch('/feature-flags', requirePermission('manage.feature_flags'), async (req, res, next) => {
  try {
    const body = FeatureFlagsPatchSchemaLegacy.parse(req.body);
    const result = await patchFeatureFlags(body, {
      userId: req.auth!.sub,
      ipAddress: req.clientIp ?? null,
      userAgent: req.header('user-agent') ?? null,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
