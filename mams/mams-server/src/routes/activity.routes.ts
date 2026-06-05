import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { ActivityListQuerySchema, UiActivityLogBodySchema } from '@mams/types';
import { requireAuth } from '../middleware/auth.js';
import { logUiActivity, listMyActivity } from '../services/activity.service.js';

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
