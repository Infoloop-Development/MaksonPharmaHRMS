import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { BugReportCreateBodySchema } from '@mams/types';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';
import { createBugReport } from '../services/bugReporting.service.js';

const router = Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.sub ?? req.ip ?? 'anon',
  message: { error: 'rate_limited', message: 'Too many bug reports submitted. Try again later.' },
});

router.post('/', requireAuth, submitLimiter, async (req, res, next) => {
  try {
    const body = BugReportCreateBodySchema.parse(req.body);
    const { id } = await createBugReport(req.auth!.sub, body);
    await audit(
      'bug_report_submitted',
      {
        userId: req.auth!.sub,
        ipAddress: req.clientIp ?? null,
        userAgent: req.header('user-agent') ?? null,
      },
      {
        entityType: 'bug_report',
        entityId: id,
        payload: {
          module: body.context.module,
          severity: body.severity,
          title: body.title,
        },
      }
    );
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
});

export default router;
