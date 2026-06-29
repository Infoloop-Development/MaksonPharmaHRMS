import { Router } from 'express';
import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { ActivityListQuerySchema, OrgActivityListQuerySchema, UiActivityLogBodySchema } from '@mams/types';
import { requireAuth, requirePermission, requireAnyPermission } from '../middleware/auth.js';
import { logUiActivity, listMyActivity, listOrgActivity } from '../services/activity.service.js';

const activityLogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `activity:${req.auth?.sub ?? 'unknown'}`,
});

const router = Router();
router.use(requireAuth);

router.get('/me', async (req, res, next) => {
  try {
    const q = ActivityListQuerySchema.parse(req.query);
    const result = await listMyActivity(req.auth!.sub, q);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/org', requireAnyPermission('read.org_audit', 'read.compliance_activity'), async (req, res, next) => {
  try {
    const q = OrgActivityListQuerySchema.parse(req.query);
    if (!req.auth!.permissions.includes('read.org_audit')) {
      q.role = 'hr.compliance';
    }
    const result = await listOrgActivity(q);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/log', activityLogLimiter, async (req, res, next) => {
  try {
    const body = UiActivityLogBodySchema.parse(req.body);
    await logUiActivity(
      {
        userId: req.auth!.sub,
        ipAddress: req.clientIp ?? null,
        userAgent: req.header('user-agent') ?? null,
      },
      body
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
