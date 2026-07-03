import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { getPublicOrgBranding } from '../services/publicOrgBranding.service.js';

const router = Router();

function ipKey(req: Request): string {
  const raw = req.ip || req.socket?.remoteAddress || 'unknown';
  return String(raw).replace(/^::ffff:/, '');
}

const getLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
});

router.get('/', getLimiter, async (_req, res, next) => {
  try {
    res.json(await getPublicOrgBranding());
  } catch (err) {
    next(err);
  }
});

export default router;
