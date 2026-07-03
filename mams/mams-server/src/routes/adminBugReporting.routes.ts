import { Router } from 'express';
import fs from 'node:fs';
import { BugReportListQuerySchema, BugReportPatchBodySchema } from '@mams/types';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';
import {
  getBugReportDetail,
  listBugReportModules,
  listBugReports,
  patchBugReport,
  streamBugReportVideo,
} from '../services/bugReporting.service.js';
import { transcribeBugReportVideo } from '../services/bugReportTranscription.service.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('manage.bug_reports'));

router.get('/modules', async (_req, res, next) => {
  try {
    res.json({ modules: await listBugReportModules() });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const query = BugReportListQuerySchema.parse(req.query);
    res.json(await listBugReports(query));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/video', async (req, res, next) => {
  try {
    const { absolutePath, mimeType, size } = await streamBugReportVideo(req.params.id ?? '');
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const startRaw = parts[0];
      const start = startRaw ? Number.parseInt(startRaw, 10) : 0;
      const end = parts[1] ? Number.parseInt(parts[1], 10) : size - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) {
        res.status(416).setHeader('Content-Range', `bytes */${size}`);
        res.end();
        return;
      }
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', mimeType);
      fs.createReadStream(absolutePath, { start, end }).pipe(res);
      return;
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', size);
    res.setHeader('Accept-Ranges', 'bytes');
    fs.createReadStream(absolutePath).pipe(res);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.json(await getBugReportDetail(req.params.id ?? ''));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/transcribe', async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    const regenerate = req.body?.regenerate === true;
    const languageRaw = typeof req.body?.language === 'string' ? req.body.language : 'auto';
    const language =
      languageRaw === 'en' || languageRaw === 'hi' || languageRaw === 'gu' ? languageRaw : 'auto';
    const updated = await transcribeBugReportVideo(id, { regenerate, language });
    await audit(
      'bug_report_transcribed',
      {
        userId: req.auth!.sub,
        ipAddress: req.clientIp ?? null,
        userAgent: req.header('user-agent') ?? null,
      },
      {
        entityType: 'bug_report',
        entityId: id,
        payload: {
          regenerate,
          language,
          status: updated.transcriptionStatus,
          detectedLanguage: updated.detectedLanguage,
          confidence: updated.transcriptionConfidence,
          error: updated.transcriptionError,
        },
      }
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = BugReportPatchBodySchema.parse(req.body);
    const updated = await patchBugReport(req.params.id ?? '', body);
    await audit(
      'bug_report_updated',
      {
        userId: req.auth!.sub,
        ipAddress: req.clientIp ?? null,
        userAgent: req.header('user-agent') ?? null,
      },
      {
        entityType: 'bug_report',
        entityId: req.params.id,
        payload: body,
      }
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
