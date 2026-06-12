import { Router } from 'express';
import { Types } from 'mongoose';
import {
  VisitorFormCreateSchema,
  VisitorFormUpdateSchema,
  VisitorRequestApproveSchema,
  VisitorRequestListQuerySchema,
  VisitorRequestRejectSchema,
  type VisitorField,
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

const router = Router();
router.use(requireAuth);

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

    const created = await VisitorFormModel.create({
      title: body.title,
      description: body.description ?? null,
      publicSlug: slug,
      formVersion: 1,
      fields: body.fields,
      isActive: body.isActive,
      createdBy: userId,
      updatedBy: userId,
    });

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

router.delete('/forms/:id', requirePermission('manage.visitors'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Form not found');
    const form = await VisitorFormModel.findOne({ _id: id, isArchived: false });
    if (!form) throw new ApiError(404, 'not_found', 'Form not found');
    form.isArchived = true;
    form.isActive = false;
    form.updatedBy = new Types.ObjectId(req.auth!.sub);
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

    doc.status = 'Approved';
    doc.decidedBy = new Types.ObjectId(req.auth!.sub);
    doc.decidedAt = new Date();
    doc.approverNote = body.approverNote ?? null;
    await doc.save();

    await audit(
      'visitor_request_approved',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'visitor_request', entityId: doc._id, payload: { formId: String(doc.formId) } }
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
