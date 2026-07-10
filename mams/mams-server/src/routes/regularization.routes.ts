import { Router } from 'express';
import { Types } from 'mongoose';
import {
  RegularizationApproveSchema,
  RegularizationCreateSchema,
  RegularizationListQuerySchema,
  RegularizationPreviewQuerySchema,
  RegularizationRejectSchema,
} from '@mams/types';
import { RegularizationRequestModel } from '../models/RegularizationRequest.js';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { AttendanceRawModel } from '../models/AttendanceRaw.js';
import { EmployeeModel } from '../models/Employee.js';
import { requireAuth, requirePermission, requireAnyPermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.service.js';
import {
  applyRegularizationApproval,
  assertNoDuplicatePending,
  formatRawPunchTime,
} from '../services/regularization/regularizationApply.service.js';
import { utcToIstTimeString } from '../utils/time.js';

const router = Router();
router.use(requireAuth);
const regularizationReadGate = requireAnyPermission('write.regularization', 'approve.regularization');

router.use((req,res,next) => {
  if (req.auth?.viewMode === 'compliant'){
    return res.status(403).json({ code: 'forbidden', message: 'Not available in compliance view'})
  }
  next();
});

router.get('/', regularizationReadGate, async (req, res, next) => {
  try {
    const q = RegularizationListQuerySchema.parse(req.query);
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
      RegularizationRequestModel.countDocuments(filter),
      RegularizationRequestModel.find(filter)
        .populate('employeeId', 'name empCode department location')
        .populate('initiatedBy', 'name email')
        .populate('decidedBy', 'name email')
        .sort({ initiatedAt: -1 })
        .skip((q.page - 1) * q.pageSize)
        .limit(q.pageSize)
        .lean(),
      RegularizationRequestModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const counts: Record<string, number> = { Pending: 0, Approved: 0, Rejected: 0 };
    for (const c of statusCounts) counts[c._id as string] = c.count;

    res.json({ items, total, page: q.page, pageSize: q.pageSize, counts });
  } catch (err) {
    next(err);
  }
});

router.get('/preview', regularizationReadGate, async (req, res, next) => {
  try {
    const q = RegularizationPreviewQuerySchema.parse(req.query);
    if (!Types.ObjectId.isValid(q.employeeId)) {
      throw new ApiError(400, 'invalid_employee', 'Invalid employeeId');
    }

    const [employee, derived, raws] = await Promise.all([
      EmployeeModel.findById(q.employeeId).select('name empCode').lean(),
      AttendanceDerivedModel.findOne({ employeeId: q.employeeId, date: q.date }).lean(),
      AttendanceRawModel.find({ employeeId: q.employeeId, rawDate: q.date })
        .sort({ rawTimestamp: 1 })
        .lean(),
    ]);

    if (!employee) throw new ApiError(404, 'not_found', 'Employee not found');

    res.json({
      employee: { id: String(employee._id), name: employee.name, empCode: employee.empCode },
      date: q.date,
      derived: derived
        ? {
            status: derived.status,
            realEntryAt: derived.realEntryAt ? utcToIstTimeString(derived.realEntryAt).slice(0, 5) : null,
            realExitAt: derived.realExitAt ? utcToIstTimeString(derived.realExitAt).slice(0, 5) : null,
            dayType: derived.dayType,
          }
        : null,
      rawPunchCount: raws.length,
      rawPunches: raws.map((r) => ({
        punchType: r.punchType,
        time: formatRawPunchTime(r.rawTimestamp),
        source: (r.rawPayload as { source?: string } | undefined)?.source ?? 'device',
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermission('write.regularization'), async (req, res, next) => {
  try {
    const body = RegularizationCreateSchema.parse(req.body);
    if (!Types.ObjectId.isValid(body.employeeId)) {
      throw new ApiError(400, 'invalid_employee', 'Invalid employeeId');
    }
    const employeeExists = await EmployeeModel.exists({ _id: body.employeeId });
    if (!employeeExists) throw new ApiError(404, 'not_found', 'Employee not found');

    await assertNoDuplicatePending(body.employeeId, body.date);

    const created = await RegularizationRequestModel.create({
      ...body,
      status: 'Pending',
      initiatedBy: req.auth!.sub,
      initiatedAt: new Date(),
      initiatedFromIp: req.clientIp ?? null,
    });

    await audit(
      'regularization_created',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      {
        entityType: 'regularization',
        entityId: created._id,
        payload: { employeeId: body.employeeId, date: body.date, type: body.type },
      }
    );

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/approve', requirePermission('approve.regularization'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Regularization request not found');
    const body = RegularizationApproveSchema.parse(req.body);

    const doc = await RegularizationRequestModel.findOne({ _id: id, status: 'Pending' });
    if (!doc) throw new ApiError(404, 'not_found', 'Pending regularization request not found');

    const appliedRawIds = await applyRegularizationApproval(doc);

    doc.status = 'Approved';
    doc.decidedBy = new Types.ObjectId(req.auth!.sub);
    doc.decidedAt = new Date();
    doc.decidedFromIp = req.clientIp ?? null;
    doc.approverNote = body.approverNote ?? null;
    doc.appliedRawIds = appliedRawIds;
    await doc.save();

    await audit(
      'regularization_approved',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      {
        entityType: 'regularization',
        entityId: doc._id,
        payload: { employeeId: String(doc.employeeId), date: doc.date, appliedRawIds: appliedRawIds.map(String) },
      }
    );

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/reject', requirePermission('approve.regularization'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Regularization request not found');
    const body = RegularizationRejectSchema.parse(req.body);

    const doc = await RegularizationRequestModel.findOne({ _id: id, status: 'Pending' });
    if (!doc) throw new ApiError(404, 'not_found', 'Pending regularization request not found');

    doc.status = 'Rejected';
    doc.decidedBy = new Types.ObjectId(req.auth!.sub);
    doc.decidedAt = new Date();
    doc.decidedFromIp = req.clientIp ?? null;
    doc.approverNote = body.approverNote;
    await doc.save();

    await audit(
      'regularization_rejected',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      {
        entityType: 'regularization',
        entityId: doc._id,
        payload: { employeeId: String(doc.employeeId), date: doc.date, note: body.approverNote },
      }
    );

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

export default router;
