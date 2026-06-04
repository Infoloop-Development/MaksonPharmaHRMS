import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getGoLiveReadiness, listOrphanPunches } from '../services/goLive.service.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('read.real'));

const OrphanQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sinceDays: z.coerce.number().int().min(1).max(90).default(14),
});

const ReadinessQuerySchema = z.object({
  daysWithoutPunch: z.coerce.number().int().min(1).max(90).default(7),
});

router.get('/orphan-punches', async (req, res, next) => {
  try {
    const q = OrphanQuerySchema.parse(req.query);
    const result = await listOrphanPunches(q);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/readiness', async (req, res, next) => {
  try {
    const q = ReadinessQuerySchema.parse(req.query);
    const result = await getGoLiveReadiness(q.daysWithoutPunch);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
