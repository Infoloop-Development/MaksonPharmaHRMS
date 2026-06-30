import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { VisitorPublicSubmitSchema, validateVisitorResponses, validateIntroAttestation, type VisitorField, type VisitorIntro } from '@mams/types';
import { VisitorFormModel } from '../models/VisitorForm.js';
import { VisitorRequestModel } from '../models/VisitorRequest.js';
import { VisitorFileModel } from '../models/VisitorFile.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.service.js';
import {
  buildVisitorSubmittedNotification,
  notifyOrgAdmins,
} from '../services/notification.service.js';
import { findFormBySlug, serializeFormForPublic } from '../services/visitor/visitorForm.service.js';
import { introUsesStorageKey } from '../services/visitor/visitorIntroMedia.service.js';

const router = Router();

const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;

function ipKey(req: Request): string {
  const raw = req.ip || req.socket?.remoteAddress || 'unknown';
  return String(raw).replace(/^::ffff:/, '');
}

const getLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
});

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/:slug', getLimiter, async (req, res, next) => {
  try {
    const slug = req.params.slug ?? '';
    const result = await findFormBySlug(slug);

    if (result.kind === 'not_found') {
      throw new ApiError(404, 'not_found', 'Visitor form not found');
    }
    if (result.kind === 'retired') {
      res.status(410).json({
        error: 'link_retired',
        message:
          'This visitor form link is no longer active. Please scan the latest QR code or use the updated link provided by the organization.',
      });
      return;
    }

    if (!result.form.isActive) {
      res.status(403).json({
        error: 'form_inactive',
        message: 'This visitor form is not currently accepting submissions.',
      });
      return;
    }

    res.json(await serializeFormForPublic(result.form));
  } catch (err) {
    next(err);
  }
});

router.get('/:slug/intro-media/:storageKey', getLimiter, async (req, res, next) => {
  try {
    const slug = req.params.slug ?? '';
    const storageKey = req.params.storageKey ?? '';
    const result = await findFormBySlug(slug);
    if (result.kind === 'retired') {
      res.status(410).json({ error: 'link_retired', message: 'This form link is no longer active.' });
      return;
    }
    if (result.kind === 'not_found') throw new ApiError(404, 'not_found', 'Visitor form not found');

    const intro = result.form.intro as VisitorIntro | null | undefined;
    if (!introUsesStorageKey(intro, storageKey)) {
      throw new ApiError(404, 'not_found', 'Media not found');
    }

    const file = await VisitorFileModel.findOne({
      storageKey,
      formId: result.form._id,
      consumed: false,
    }).lean();
    if (!file) throw new ApiError(404, 'not_found', 'Media not found');

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(file.data);
  } catch (err) {
    next(err);
  }
});

router.post('/:slug/upload', uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    const slug = req.params.slug ?? '';
    const fieldId = String(req.body?.fieldId ?? '');
    if (!fieldId) throw new ApiError(400, 'invalid_field', 'fieldId is required');

    const result = await findFormBySlug(slug);
    if (result.kind === 'retired') {
      res.status(410).json({ error: 'link_retired', message: 'This form link is no longer active.' });
      return;
    }
    if (result.kind === 'not_found') throw new ApiError(404, 'not_found', 'Visitor form not found');
    if (!result.form.isActive) throw new ApiError(403, 'form_inactive', 'Form is not accepting submissions');

    const field = (result.form.fields as VisitorField[]).find((f) => f.id === fieldId && f.type === 'file');
    if (!field) throw new ApiError(400, 'invalid_field', 'Invalid file field');

    const file = req.file;
    if (!file) throw new ApiError(400, 'no_file', 'No file uploaded');

    const maxBytes = field.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
    if (file.size > maxBytes) {
      throw new ApiError(400, 'file_too_large', `File exceeds maximum size of ${Math.round(maxBytes / 1024)} KB`);
    }

    const storageKey = randomBytes(16).toString('base64url');
    await VisitorFileModel.create({
      storageKey,
      formId: result.form._id,
      fieldId,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      data: file.buffer,
      submitterIp: req.clientIp ?? null,
      consumed: false,
    });

    res.status(201).json({ storageKey, filename: file.originalname, size: file.size, mimeType: file.mimetype });
  } catch (err) {
    next(err);
  }
});

router.post('/:slug/submit', submitLimiter, async (req, res, next) => {
  try {
    const slug = req.params.slug ?? '';
    const body = VisitorPublicSubmitSchema.parse(req.body);

    const result = await findFormBySlug(slug);
    if (result.kind === 'retired') {
      res.status(410).json({ error: 'link_retired', message: 'This form link is no longer active.' });
      return;
    }
    if (result.kind === 'not_found') throw new ApiError(404, 'not_found', 'Visitor form not found');
    if (!result.form.isActive) throw new ApiError(403, 'form_inactive', 'Form is not accepting submissions');

    const fields = result.form.fields as VisitorField[];
    const fileFieldIds = new Set<string>();

    for (const ref of body.fileRefs) {
      const field = fields.find((f) => f.id === ref.fieldId && f.type === 'file');
      if (!field) throw new ApiError(400, 'invalid_file_ref', `Invalid file reference for field ${ref.fieldId}`);

      const fileDoc = await VisitorFileModel.findOne({
        storageKey: ref.storageKey,
        formId: result.form._id,
        fieldId: ref.fieldId,
        consumed: false,
      });
      if (!fileDoc) throw new ApiError(400, 'invalid_file_ref', 'File upload expired or invalid');
      fileFieldIds.add(ref.fieldId);
    }

    const validation = validateVisitorResponses(fields, body.responses, fileFieldIds);
    if (!validation.ok) {
      throw new ApiError(400, 'validation_error', 'Please correct the highlighted fields', validation.errors);
    }

    const intro = result.form.intro as VisitorIntro | null | undefined;
    const submitLocale = body.locale ?? 'en';
    const introError = validateIntroAttestation(intro, body.introAttestation, submitLocale);
    if (introError) {
      throw new ApiError(400, 'intro_video_required', introError);
    }

    const fileAttachments = [];
    for (const ref of body.fileRefs) {
      const fileDoc = await VisitorFileModel.findOneAndUpdate(
        { storageKey: ref.storageKey, consumed: false },
        { $set: { consumed: true } },
        { new: true }
      );
      if (fileDoc) {
        fileAttachments.push({
          fieldId: ref.fieldId,
          filename: fileDoc.filename,
          mimeType: fileDoc.mimeType,
          size: fileDoc.size,
          storageKey: fileDoc.storageKey,
        });
      }
    }

    const created = await VisitorRequestModel.create({
      formId: result.form._id,
      formVersion: result.form.formVersion,
      publicSlug: slug,
      formTitle: result.form.title,
      fieldsSnapshot: fields,
      responses: body.responses,
      fileAttachments,
      introAttestation: body.introAttestation
        ? {
            videoCompleted: true,
            completedAt: new Date(body.introAttestation.completedAt),
          }
        : null,
      status: 'Pending',
      submittedAt: new Date(),
      submitterIp: req.clientIp ?? null,
    });

    await audit(
      'visitor_request_submitted',
      { userId: null, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      {
        entityType: 'visitor_request',
        entityId: created._id,
        payload: { formId: String(result.form._id), publicSlug: slug },
      }
    );

    await notifyOrgAdmins(
      buildVisitorSubmittedNotification({
        formTitle: result.form.title,
        publicSlug: slug,
        entityId: created._id,
      })
    );

    res.status(201).json({ ok: true, message: 'Your visitor request has been submitted successfully and is awaiting review.' });
  } catch (err) {
    next(err);
  }
});

export default router;
