import { Router } from 'express';
import fs from 'node:fs';
import multer from 'multer';
import {
  BugPhaseCreateBodySchema,
  BugPhaseDeleteBodySchema,
  BugPhasePatchBodySchema,
  BugPhaseReorderBodySchema,
  BugReportListQuerySchema,
  BugReportPatchBodySchema,
} from '@mams/types';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';
import {
  createBugPhase,
  deleteBugPhase,
  listBugPhases,
  patchBugPhase,
  reorderBugPhases,
} from '../services/bugPhase.service.js';
import {
  getBugReportDetail,
  listBugReportModules,
  listBugReports,
  patchBugReport,
  streamBugReportVideo,
  streamBugReportAttachment,
} from '../services/bugReporting.service.js';
import {
  createBugReportComment,
  listBugReportComments,
  streamBugReportCommentAttachment,
} from '../services/bugReportComment.service.js';
import { MAX_BUG_REPORT_COMMENT_IMAGE_BYTES } from '../services/bugReportMedia.storage.js';
import { transcribeBugReportVideo } from '../services/bugReportTranscription.service.js';
import { UserModel } from '../models/User.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('manage.bug_reports'));

const commentImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BUG_REPORT_COMMENT_IMAGE_BYTES },
});

router.get('/phases', async (_req, res, next) => {
  try {
    res.json({ phases: await listBugPhases() });
  } catch (err) {
    next(err);
  }
});

router.post('/phases', async (req, res, next) => {
  try {
    const body = BugPhaseCreateBodySchema.parse(req.body);
    const phase = await createBugPhase(body);
    res.status(201).json(phase);
  } catch (err) {
    next(err);
  }
});

router.put('/phases/reorder', async (req, res, next) => {
  try {
    const body = BugPhaseReorderBodySchema.parse(req.body);
    res.json({ phases: await reorderBugPhases(body) });
  } catch (err) {
    next(err);
  }
});

router.patch('/phases/:phaseId', async (req, res, next) => {
  try {
    const body = BugPhasePatchBodySchema.parse(req.body);
    res.json(await patchBugPhase(req.params.phaseId ?? '', body));
  } catch (err) {
    next(err);
  }
});

router.delete('/phases/:phaseId', async (req, res, next) => {
  try {
    const body = BugPhaseDeleteBodySchema.parse(req.body ?? {});
    const reassignToPhaseId =
      body.reassignToPhaseId ??
      (typeof req.query.reassignToPhaseId === 'string' ? req.query.reassignToPhaseId : undefined);
    await deleteBugPhase(req.params.phaseId ?? '', reassignToPhaseId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
router.get('/modules', async (_req, res, next) => {
  try {
    res.json({ modules: await listBugReportModules() });
  } catch (err) {
    next(err);
  }
});

router.get('/assignees', async (_req, res, next) => {
  try {
    const items = await UserModel.find({ role: 'it.admin', isActive: true })
      .select('name email role')
      .sort({ name: 1 })
      .lean();
    res.json({
      items: items.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        role: 'it.admin' as const,
      })),
    });
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

router.get('/:id/comments', async (req, res, next) => {
  try {
    res.json({ comments: await listBugReportComments(req.params.id ?? '') });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/comments',
  commentImageUpload.single('image'),
  async (req, res, next) => {
    try {
      const reportId = req.params.id ?? '';
      let body: unknown = req.body;
      if (typeof req.body?.body === 'string') {
        try {
          body = {
            body: req.body.body,
            parentId: req.body.parentId || undefined,
            mentionUserIds: req.body.mentionUserIds
              ? JSON.parse(String(req.body.mentionUserIds))
              : undefined,
          };
        } catch {
          body = { body: req.body.body, parentId: req.body.parentId || undefined };
        }
      }
      const file = req.file;
      const comment = await createBugReportComment(
        reportId,
        req.auth!.sub,
        body,
        file
          ? {
              buffer: file.buffer,
              mimetype: file.mimetype,
              size: file.size,
              originalname: file.originalname,
            }
          : undefined
      );
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:id/comments/:commentId/attachments/:attachmentId', async (req, res, next) => {
  try {
    const { absolutePath, mimeType, size, originalName } = await streamBugReportCommentAttachment(
      req.params.id ?? '',
      req.params.commentId ?? '',
      req.params.attachmentId ?? ''
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', size);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
    fs.createReadStream(absolutePath).pipe(res);
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

router.get('/:id/attachments/:attachmentId', async (req, res, next) => {
  try {
    const { absolutePath, mimeType, size, originalName } = await streamBugReportAttachment(
      req.params.id ?? '',
      req.params.attachmentId ?? ''
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', size);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(originalName)}"`
    );
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
    const updated = await patchBugReport(req.params.id ?? '', body, req.auth!.sub);
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
