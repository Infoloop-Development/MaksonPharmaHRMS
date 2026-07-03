import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { BugReportCreateBodySchema } from '@mams/types';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';
import { attachBugReportVideo, createBugReport } from '../services/bugReporting.service.js';
import { MAX_BUG_REPORT_VIDEO_BYTES } from '../services/bugReportMedia.storage.js';

const router = Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.sub ?? req.ip ?? 'anon',
  message: { error: 'rate_limited', message: 'Too many bug reports submitted. Try again later.' },
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BUG_REPORT_VIDEO_BYTES },
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

router.post(
  '/:id/video',
  requireAuth,
  submitLimiter,
  videoUpload.single('video'),
  async (req, res, next) => {
    try {
      const reportId = req.params.id ?? '';
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'missing_file', message: 'No video file uploaded' });
        return;
      }

      const durationMsRaw = req.body?.durationMs;
      const durationMs =
        durationMsRaw !== undefined && durationMsRaw !== ''
          ? Number.parseInt(String(durationMsRaw), 10)
          : undefined;

      await attachBugReportVideo(
        reportId,
        req.auth!.sub,
        req.auth!.permissions,
        { buffer: file.buffer, mimetype: file.mimetype, size: file.size, originalname: file.originalname },
        Number.isFinite(durationMs) ? durationMs : undefined
      );

      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
