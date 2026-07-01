import { Router } from 'express';
import { Types } from 'mongoose';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import {
  VisitorFormCreateSchema,
  VisitorFormUpdateSchema,
  VisitorRequestApproveSchema,
  VisitorRequestListQuerySchema,
  VisitorRequestRejectSchema,
  VisitorFormLocaleSchema,
  nextVisitorFormLayoutOrder,
  normalizeVisitorLanguages,
  resolveVisitValidUntil,
  type VisitorField,
  type VisitorFormLocale,
  BulkIdsBodySchema,
} from '@mams/types';
import { VisitorFormModel } from '../models/VisitorForm.js';
import { VisitorRequestModel } from '../models/VisitorRequest.js';
import { VisitorFileModel } from '../models/VisitorFile.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.service.js';
import {
  buildPublicUrl,
  enrichFormResponse,
  generatePublicSlug,
} from '../services/visitor/visitorForm.service.js';
import {
  normalizeIntroForStorage,
  plainIntro,
  VISITOR_INTRO_IMAGE_FIELD_ID,
  visitorIntroVideoFieldId,
} from '../services/visitor/visitorIntroMedia.service.js';
import { buildVisitorFormTranslations } from '../services/visitor/visitorTranslate.service.js';
import { softDeleteFields } from '../utils/softDelete.util.js';

const router = Router();
router.use(requireAuth);

const INTRO_IMAGE_MAX = 5 * 1024 * 1024;
const INTRO_VIDEO_MAX = 25 * 1024 * 1024;

const introUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: INTRO_VIDEO_MAX },
});

async function assertIntroStorageKeys(formId: Types.ObjectId, intro: ReturnType<typeof normalizeIntroForStorage>) {
  if (intro?.image?.storageKey) {
    const ok = await VisitorFileModel.exists({
      formId,
      fieldId: VISITOR_INTRO_IMAGE_FIELD_ID,
      storageKey: intro.image.storageKey,
      consumed: false,
    });
    if (!ok) throw new ApiError(400, 'invalid_intro', 'Intro image upload is missing or expired');
  }
  const videoChecks: Array<{ locale: VisitorFormLocale; storageKey?: string }> = [
    { locale: 'en', storageKey: intro?.video?.storageKey },
    { locale: 'gu', storageKey: intro?.videoByLocale?.gu?.storageKey },
    { locale: 'hi', storageKey: intro?.videoByLocale?.hi?.storageKey },
  ];
  for (const { locale, storageKey } of videoChecks) {
    if (!storageKey) continue;
    const ok = await VisitorFileModel.exists({
      formId,
      fieldId: visitorIntroVideoFieldId(locale),
      storageKey,
      consumed: false,
    });
    if (!ok) throw new ApiError(400, 'invalid_intro', `Intro video upload is missing or expired (${locale})`);
  }
}

async function refreshFormTranslations(form: InstanceType<typeof VisitorFormModel>) {
  const multilingual = normalizeVisitorLanguages(form.multilingual as Parameters<typeof normalizeVisitorLanguages>[0]);
  form.set('multilingual', multilingual);
  const translations = await buildVisitorFormTranslations({
    title: form.title,
    description: form.description ?? null,
    fields: form.fields as VisitorField[],
    multilingual,
  });
  form.set('translations', translations);
  form.markModified('translations');
  await form.save();
}

// --- Forms ---

router.get('/forms/summary', requireAnyPermission('read.visitors', 'approve.visitors', 'manage.visitors'), async (_req, res, next) => {
  try {
    const forms = await VisitorFormModel.find({ isArchived: false })
      .select('title publicSlug')
      .sort({ title: 1 })
      .lean();
    res.json({
      items: forms.map((f) => ({ _id: String(f._id), title: f.title, publicSlug: f.publicSlug })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/forms', requirePermission('manage.visitors'), async (_req, res, next) => {
  try {
    const forms = await VisitorFormModel.find({ isArchived: false })
      .sort({ updatedAt: -1 })
      .lean();
    const formIds = forms.map((f) => f._id);
    const counts = await VisitorRequestModel.aggregate([
      { $match: { formId: { $in: formIds } } },
      { $group: { _id: '$formId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count as number]));

    res.json({
      items: forms.map((f) => ({
        _id: String(f._id),
        title: f.title,
        description: f.description,
        intro: f.intro ?? null,
        multilingual: normalizeVisitorLanguages(f.multilingual as Parameters<typeof normalizeVisitorLanguages>[0]),
        publicSlug: f.publicSlug,
        publicUrl: buildPublicUrl(f.publicSlug),
        formVersion: f.formVersion,
        fields: f.fields,
        isActive: f.isActive,
        submissionCount: countMap.get(String(f._id)) ?? 0,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/forms', requirePermission('manage.visitors'), async (req, res, next) => {
  try {
    const body = VisitorFormCreateSchema.parse(req.body);
    const userId = new Types.ObjectId(req.auth!.sub);
    let slug = generatePublicSlug();
    for (let i = 0; i < 5; i++) {
      const exists = await VisitorFormModel.exists({ publicSlug: slug });
      if (!exists) break;
      slug = generatePublicSlug();
    }

    const intro = normalizeIntroForStorage(body.intro);
    const multilingual = normalizeVisitorLanguages(body.multilingual);

    const created = await VisitorFormModel.create({
      title: body.title,
      description: body.description ?? null,
      intro,
      multilingual,
      translations: null,
      publicSlug: slug,
      formVersion: 1,
      fields: body.fields,
      isActive: body.isActive,
      createdBy: userId,
      updatedBy: userId,
    });

    if (intro) await assertIntroStorageKeys(created._id, intro);
    await refreshFormTranslations(created);

    await audit(
      'visitor_form_created',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'visitor_form', entityId: created._id, payload: { title: body.title, publicSlug: slug } }
    );

    res.status(201).json(enrichFormResponse(created, 0));
  } catch (err) {
    next(err);
  }
});

router.get('/forms/:id', requirePermission('manage.visitors'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Form not found');
    const form = await VisitorFormModel.findOne({ _id: id, isArchived: false });
    if (!form) throw new ApiError(404, 'not_found', 'Form not found');
    const submissionCount = await VisitorRequestModel.countDocuments({ formId: form._id });
    res.json(enrichFormResponse(form, submissionCount));
  } catch (err) {
    next(err);
  }
});

router.patch('/forms/:id', requirePermission('manage.visitors'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Form not found');
    const body = VisitorFormUpdateSchema.parse(req.body);

    const form = await VisitorFormModel.findOne({ _id: id, isArchived: false });
    if (!form) throw new ApiError(404, 'not_found', 'Form not found');

    const userId = new Types.ObjectId(req.auth!.sub);
    let slugRegenerated = false;
    const oldSlug = form.publicSlug;

    if (body.title !== undefined) form.title = body.title;
    if (body.description !== undefined) form.description = body.description ?? null;
    if (body.intro !== undefined) {
      const normalizedIntro = normalizeIntroForStorage(body.intro ?? undefined);
      form.set('intro', normalizedIntro);
      form.markModified('intro');
      if (normalizedIntro) await assertIntroStorageKeys(form._id, normalizedIntro);
    }
    if (body.multilingual !== undefined) {
      form.set('multilingual', normalizeVisitorLanguages(body.multilingual));
      form.markModified('multilingual');
    }
    if (body.fields !== undefined) form.set('fields', body.fields);
    if (body.isActive !== undefined) form.isActive = body.isActive;
    form.formVersion += 1;
    form.updatedBy = userId;

    if (body.slugStrategy === 'regenerate') {
      form.retiredSlugs.push({ slug: form.publicSlug, retiredAt: new Date() });
      let newSlug = generatePublicSlug();
      for (let i = 0; i < 5; i++) {
        const exists = await VisitorFormModel.exists({ publicSlug: newSlug });
        if (!exists) break;
        newSlug = generatePublicSlug();
      }
      form.publicSlug = newSlug;
      slugRegenerated = true;
    }

    await form.save();
    await refreshFormTranslations(form);

    const eventType = slugRegenerated ? 'visitor_form_slug_regenerated' : 'visitor_form_updated';
    await audit(
      eventType,
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      {
        entityType: 'visitor_form',
        entityId: form._id,
        payload: slugRegenerated
          ? { oldSlug, newSlug: form.publicSlug, formVersion: form.formVersion }
          : { formVersion: form.formVersion },
      }
    );

    const submissionCount = await VisitorRequestModel.countDocuments({ formId: form._id });
    res.json({ ...enrichFormResponse(form, submissionCount), slugRegenerated });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/forms/:id/intro-upload',
  requirePermission('manage.visitors'),
  introUpload.single('file'),
  async (req, res, next) => {
    try {
      const id = req.params.id ?? '';
      if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Form not found');
      const form = await VisitorFormModel.findOne({ _id: id, isArchived: false });
      if (!form) throw new ApiError(404, 'not_found', 'Form not found');

      const kind = String(req.body?.kind ?? '');
      if (kind !== 'image' && kind !== 'video') {
        throw new ApiError(400, 'invalid_kind', 'kind must be image or video');
      }

      let locale: VisitorFormLocale = 'en';
      if (kind === 'video') {
        locale = VisitorFormLocaleSchema.parse(String(req.body?.locale ?? 'en'));
      }

      const file = req.file;
      if (!file) throw new ApiError(400, 'missing_file', 'No file uploaded');

      const maxBytes = kind === 'image' ? INTRO_IMAGE_MAX : INTRO_VIDEO_MAX;
      if (file.size > maxBytes) {
        throw new ApiError(400, 'file_too_large', `File exceeds ${kind === 'image' ? '5MB' : '25MB'} limit`);
      }

      const allowedImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const allowedVideo = ['video/mp4', 'video/webm'];
      const allowed = kind === 'image' ? allowedImage : allowedVideo;
      if (!allowed.includes(file.mimetype)) {
        throw new ApiError(400, 'invalid_file_type', `Invalid ${kind} file type`);
      }

      const fieldId =
        kind === 'image' ? VISITOR_INTRO_IMAGE_FIELD_ID : visitorIntroVideoFieldId(locale);
      const storageKey = randomBytes(16).toString('hex');

      await VisitorFileModel.create({
        formId: form._id,
        fieldId,
        storageKey,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        data: file.buffer,
        consumed: false,
      });

      const existingIntro = plainIntro(form.intro as Parameters<typeof plainIntro>[0]) ?? {};
      const formFields = (form.fields as VisitorField[]) ?? [];
      const nextIntro = { ...existingIntro };
      const placementOrder = nextVisitorFormLayoutOrder(existingIntro, formFields);

      if (kind === 'image') {
        nextIntro.image = {
          source: 'upload' as const,
          storageKey,
          order: existingIntro.image?.order ?? placementOrder,
        };
      } else if (locale === 'en') {
        nextIntro.video = {
          source: 'upload' as const,
          storageKey,
          viewingMandatory: existingIntro.video?.viewingMandatory ?? false,
          order: existingIntro.video?.order ?? placementOrder,
        };
      } else {
        nextIntro.videoByLocale = {
          ...existingIntro.videoByLocale,
          [locale]: {
            source: 'upload' as const,
            storageKey,
            viewingMandatory:
              existingIntro.videoByLocale?.[locale]?.viewingMandatory ??
              existingIntro.video?.viewingMandatory ??
              false,
            order:
              existingIntro.videoByLocale?.[locale]?.order ??
              existingIntro.video?.order ??
              placementOrder,
          },
        };
      }
      form.set('intro', nextIntro);
      form.markModified('intro');
      await form.save();

      res.status(201).json({
        storageKey,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        intro: plainIntro(nextIntro),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch('/forms/:id/toggle-active', requirePermission('manage.visitors'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Form not found');
    const form = await VisitorFormModel.findOne({ _id: id, isArchived: false });
    if (!form) throw new ApiError(404, 'not_found', 'Form not found');
    form.isActive = !form.isActive;
    form.updatedBy = new Types.ObjectId(req.auth!.sub);
    await form.save();
    const submissionCount = await VisitorRequestModel.countDocuments({ formId: form._id });
    res.json(enrichFormResponse(form, submissionCount));
  } catch (err) {
    next(err);
  }
});

router.post('/forms/bulk-archive', requirePermission('manage.visitors'), async (req, res, next) => {
  try {
    const body = BulkIdsBodySchema.parse(req.body);
    const result = { succeeded: 0, skipped: 0, errors: [] as Array<{ id: string; reason: string }> };

    for (const id of body.ids) {
      if (!Types.ObjectId.isValid(id)) {
        result.skipped += 1;
        result.errors.push({ id, reason: 'Invalid id' });
        continue;
      }
      const form = await VisitorFormModel.findOne({ _id: id, isArchived: false });
      if (!form) {
        result.skipped += 1;
        result.errors.push({ id, reason: 'Form not found or already archived' });
        continue;
      }
      form.isArchived = true;
      form.isActive = false;
      form.updatedBy = new Types.ObjectId(req.auth!.sub);
      Object.assign(form, softDeleteFields(req.auth!.sub));
      await form.save();
      result.succeeded += 1;
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/forms/:id', requirePermission('manage.visitors'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Form not found');
    const form = await VisitorFormModel.findOne({ _id: id, isArchived: false });
    if (!form) throw new ApiError(404, 'not_found', 'Form not found');
    form.isArchived = true;
    form.isActive = false;
    form.updatedBy = new Types.ObjectId(req.auth!.sub);
    Object.assign(form, softDeleteFields(req.auth!.sub));
    await form.save();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// --- Requests (read.visitors / approve.visitors) ---

router.get('/requests', requireAnyPermission('read.visitors', 'approve.visitors', 'manage.visitors'), async (req, res, next) => {
  try {
    const q = VisitorRequestListQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (q.status) filter.status = q.status;
    if (q.formId && Types.ObjectId.isValid(q.formId)) filter.formId = q.formId;
    if (q.startDate || q.endDate) {
      filter.submittedAt = {
        ...(q.startDate ? { $gte: new Date(`${q.startDate}T00:00:00.000Z`) } : {}),
        ...(q.endDate ? { $lte: new Date(`${q.endDate}T23:59:59.999Z`) } : {}),
      };
    }
    if (q.search?.trim()) {
      const re = new RegExp(q.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ formTitle: re }, { responses: re }];
    }

    const [total, items, statusCounts] = await Promise.all([
      VisitorRequestModel.countDocuments(filter),
      VisitorRequestModel.find(filter)
        .populate('formId', 'title publicSlug')
        .populate('decidedBy', 'name email')
        .sort({ submittedAt: -1 })
        .skip((q.page - 1) * q.pageSize)
        .limit(q.pageSize)
        .lean(),
      VisitorRequestModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const counts: Record<string, number> = { Pending: 0, Approved: 0, Rejected: 0 };
    for (const c of statusCounts) counts[c._id as string] = c.count;

    res.json({ items, total, page: q.page, pageSize: q.pageSize, counts });
  } catch (err) {
    next(err);
  }
});

router.get('/requests/:id', requireAnyPermission('read.visitors', 'approve.visitors', 'manage.visitors'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Request not found');
    const item = await VisitorRequestModel.findById(id)
      .populate('formId', 'title publicSlug formVersion')
      .populate('decidedBy', 'name email')
      .lean();
    if (!item) throw new ApiError(404, 'not_found', 'Request not found');

    const auditTrail = await AuditLogModel.find({
      entityType: 'visitor_request',
      entityId: item._id,
    })
      .populate('userId', 'name email')
      .sort({ occurredAt: 1 })
      .lean();

    res.json({ item, auditTrail });
  } catch (err) {
    next(err);
  }
});

router.patch('/requests/:id/approve', requireAnyPermission('approve.visitors', 'manage.visitors'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Request not found');
    const body = VisitorRequestApproveSchema.parse(req.body);

    const doc = await VisitorRequestModel.findOne({ _id: id, status: 'Pending' });
    if (!doc) throw new ApiError(404, 'not_found', 'Pending visitor request not found');

    const decidedAt = new Date();
    const access = resolveVisitValidUntil(body.visitAccess, decidedAt);

    doc.status = 'Approved';
    doc.decidedBy = new Types.ObjectId(req.auth!.sub);
    doc.decidedAt = decidedAt;
    doc.approverNote = body.approverNote ?? null;
    doc.visitValidUntil = access.visitValidUntil;
    doc.visitAccessMode = access.visitAccessMode;
    doc.visitDurationHours = access.visitDurationHours;
    await doc.save();

    await audit(
      'visitor_request_approved',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      {
        entityType: 'visitor_request',
        entityId: doc._id,
        payload: {
          formId: String(doc.formId),
          visitValidUntil: access.visitValidUntil.toISOString(),
          visitAccessMode: access.visitAccessMode,
          visitDurationHours: access.visitDurationHours,
        },
      }
    );

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.patch('/requests/:id/reject', requireAnyPermission('approve.visitors', 'manage.visitors'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Request not found');
    const body = VisitorRequestRejectSchema.parse(req.body);

    const doc = await VisitorRequestModel.findOne({ _id: id, status: 'Pending' });
    if (!doc) throw new ApiError(404, 'not_found', 'Pending visitor request not found');

    doc.status = 'Rejected';
    doc.decidedBy = new Types.ObjectId(req.auth!.sub);
    doc.decidedAt = new Date();
    doc.approverNote = body.approverNote;
    await doc.save();

    await audit(
      'visitor_request_rejected',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'visitor_request', entityId: doc._id, payload: { formId: String(doc.formId), note: body.approverNote } }
    );

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.get('/files/:storageKey', requireAnyPermission('read.visitors', 'approve.visitors', 'manage.visitors'), async (req, res, next) => {
  try {
    const storageKey = req.params.storageKey ?? '';
    const file = await VisitorFileModel.findOne({ storageKey }).lean();
    if (!file) throw new ApiError(404, 'not_found', 'File not found');
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    res.send(file.data);
  } catch (err) {
    next(err);
  }
});

export default router;
