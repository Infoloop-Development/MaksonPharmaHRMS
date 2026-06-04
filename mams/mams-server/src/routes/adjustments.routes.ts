import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AdjustmentModel } from '../models/Adjustment.js';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { EmployeeModel } from '../models/Employee.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.service.js';
import { recomputeDerived } from '../services/attendance.service.js';
import { AdjustmentCreateSchema, AdjustmentDecisionSchema } from '@mams/types';

const router = Router();
router.use(requireAuth);

const ListQuerySchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  employeeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

router.get('/', async (req, res, next) => {
  try {
    const q = ListQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (q.status) filter.status = q.status;
    if (q.employeeId) filter.employeeId = q.employeeId;
    if (q.startDate || q.endDate) {
      filter.date = {
        ...(q.startDate ? { $gte: q.startDate } : {}),
        ...(q.endDate ? { $lte: q.endDate } : {}),
      };
    }

    const [total, items, statusCounts] = await Promise.all([
      AdjustmentModel.countDocuments(filter),
      AdjustmentModel.find(filter)
        .populate('employeeId', 'name empCode department location')
        .populate('initiatedBy', 'name email')
        .populate('decidedBy', 'name email')
        .sort({ initiatedAt: -1 })
        .skip((q.page - 1) * q.pageSize)
        .limit(q.pageSize)
        .lean(),
      AdjustmentModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const counts: Record<string, number> = { Pending: 0, Approved: 0, Rejected: 0 };
    for (const c of statusCounts) counts[c._id as string] = c.count;

    res.json({ items, total, page: q.page, pageSize: q.pageSize, counts });
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermission('write.adjust'), async (req, res, next) => {
  try {
    const body = AdjustmentCreateSchema.parse(req.body);
    if (!Types.ObjectId.isValid(body.employeeId)) {
      throw new ApiError(400, 'invalid_employee', 'Invalid employeeId');
    }
    const employeeExists = await EmployeeModel.exists({ _id: body.employeeId });
    if (!employeeExists) throw new ApiError(404, 'not_found', 'Employee not found');

    const created = await AdjustmentModel.create({
      ...body,
      status: 'Pending',
      initiatedBy: req.auth!.sub,
      initiatedAt: new Date(),
      initiatedFromIp: req.clientIp ?? null,
    });

    await audit(
      'adjustment_initiated',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'adjustment', entityId: created._id, payload: { employeeId: body.employeeId, date: body.date, fieldChanged: body.fieldChanged } }
    );

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

const BulkDecisionSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  decision: z.enum(['approve', 'reject']),
  approverNote: z.string().max(2000).optional(),
});

router.post('/bulk-decide', requirePermission('approve.adjust'), async (req, res, next) => {
  try {
    const body = BulkDecisionSchema.parse(req.body);
    const validIds = body.ids.filter((id) => Types.ObjectId.isValid(id));
    const result = { approved: 0, rejected: 0, skipped: 0, errors: [] as Array<{ id: string; reason: string }> };

    for (const id of validIds) {
      const doc = await AdjustmentModel.findOne({ _id: id, status: 'Pending' });
      if (!doc) {
        result.skipped += 1;
        continue;
      }
      doc.status = body.decision === 'approve' ? 'Approved' : 'Rejected';
      doc.decidedBy = new Types.ObjectId(req.auth!.sub);
      doc.decidedAt = new Date();
      doc.decidedFromIp = req.clientIp ?? null;
      doc.approverNote = body.approverNote ?? null;
      await doc.save();

      if (body.decision === 'approve') {
        await recomputeDerived(doc.employeeId, doc.date, 'manual_adjustment_applied');
        result.approved += 1;
      } else {
        result.rejected += 1;
      }

      await audit(
        body.decision === 'approve' ? 'adjustment_approved' : 'adjustment_rejected',
        { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
        { entityType: 'adjustment', entityId: doc._id, payload: { decision: body.decision, employeeId: String(doc.employeeId), date: doc.date } }
      );
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/decide', requirePermission('approve.adjust'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Adjustment not found');
    const body = AdjustmentDecisionSchema.parse(req.body);

    const doc = await AdjustmentModel.findOne({ _id: id, status: 'Pending' });
    if (!doc) throw new ApiError(404, 'not_found', 'Pending adjustment not found');

    doc.status = body.decision === 'approve' ? 'Approved' : 'Rejected';
    doc.decidedBy = new Types.ObjectId(req.auth!.sub);
    doc.decidedAt = new Date();
    doc.decidedFromIp = req.clientIp ?? null;
    doc.approverNote = body.approverNote ?? null;
    await doc.save();

    if (body.decision === 'approve') {
      await recomputeDerived(doc.employeeId, doc.date, 'manual_adjustment_applied');
      await AttendanceDerivedModel.updateOne(
        { employeeId: doc.employeeId, date: doc.date },
        { $set: { appliedAdjustmentId: doc._id } }
      );
    }

    await audit(
      body.decision === 'approve' ? 'adjustment_approved' : 'adjustment_rejected',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'adjustment', entityId: doc._id, payload: { decision: body.decision, employeeId: String(doc.employeeId), date: doc.date } }
    );

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

export default router;
