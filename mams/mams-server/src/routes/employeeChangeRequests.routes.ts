import { Router } from 'express';
import { Types } from 'mongoose';
import { EmployeeChangeRequestModel } from '../models/EmployeeChangeRequest.js';
import { EmployeeModel } from '../models/Employee.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.service.js';
import { allocateNextEmpCode } from '../services/employeeCode.service.js';
import {
  EmployeeChangeRequestBodySchema,
  EmployeeChangeRequestDecisionSchema,
  EmployeeChangeRequestListQuerySchema,
} from '@mams/types';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const q = EmployeeChangeRequestListQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (q.status) filter.status = q.status;
    if (q.changeType) filter.changeType = q.changeType;
    if (q.employeeId) filter.employeeId = q.employeeId;

    if (req.auth!.viewMode === 'compliant') {
      filter.initiatedBy = new Types.ObjectId(req.auth!.sub);
    }

    const [total, items, statusCounts] = await Promise.all([
      EmployeeChangeRequestModel.countDocuments(filter),
      EmployeeChangeRequestModel.find(filter)
        .populate('employeeId', 'name empCode')
        .populate('initiatedBy', 'name email')
        .populate('decidedBy', 'name email')
        .sort({ initiatedAt: -1 })
        .skip((q.page - 1) * q.pageSize)
        .limit(q.pageSize)
        .lean(),
      EmployeeChangeRequestModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const counts: Record<string, number> = { Pending: 0, Approved: 0, Rejected: 0 };
    for (const c of statusCounts) counts[c._id as string] = c.count;

    res.json({ items, total, page: q.page, pageSize: q.pageSize, counts });
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermission('write.employee_change'), async (req, res, next) => {
  try {
    const body = EmployeeChangeRequestBodySchema.parse(req.body);

    let employeeId: Types.ObjectId | null = null;
    let previousData: Record<string, unknown> | null = null;

    if (body.changeType === 'update' || body.changeType === 'delete') {
      if (!Types.ObjectId.isValid(body.employeeId)) {
        throw new ApiError(400, 'invalid_employee', 'Invalid employeeId');
      }
      const emp = await EmployeeModel.findOne({ _id: body.employeeId, isDeleted: { $ne: true } }).lean();
      if (!emp) throw new ApiError(404, 'not_found', 'Employee not found');
      employeeId = new Types.ObjectId(body.employeeId);
      const { _id, __v, ...rest } = emp as Record<string, unknown>;
      previousData = { id: String(_id), ...rest };
    }

    if (employeeId) {
      const existing = await EmployeeChangeRequestModel.findOne({ employeeId, status: 'Pending' });
      if (existing) {
        throw new ApiError(409, 'duplicate_pending', 'A pending change request already exists for this employee');
      }
    }

    const created = await EmployeeChangeRequestModel.create({
      changeType: body.changeType,
      employeeId,
      proposedData: body.changeType !== 'delete' ? body.proposedData : null,
      previousData,
      reason: body.reason,
      status: 'Pending',
      initiatedBy: new Types.ObjectId(req.auth!.sub),
      initiatedAt: new Date(),
      initiatedFromIp: req.clientIp ?? null,
    });

    await audit(
      'employee_change_request_submitted',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'employee_change_request', entityId: created._id, payload: { changeType: body.changeType, employeeId: employeeId?.toString() ?? null } }
    );

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/decide', requirePermission('approve.employee_change'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Request not found');

    const body = EmployeeChangeRequestDecisionSchema.parse(req.body);
    const doc = await EmployeeChangeRequestModel.findOne({ _id: id, status: 'Pending' });
    if (!doc) throw new ApiError(404, 'not_found', 'Pending change request not found');

    if (body.decision === 'approve') {
      if (doc.changeType === 'create') {
        if (!body.timeShift) {
          throw new ApiError(400, 'missing_time_shift', 'timeShift (Day or Night) is required when approving a create request');
        }
        const proposed = doc.proposedData as Record<string, unknown>;
        const empCode = await allocateNextEmpCode();
        await EmployeeModel.create({
          empCode,
          name: proposed.name,
          gender: proposed.gender,
          department: proposed.department,
          designation: proposed.designation,
          location: proposed.location,
          timeShift: body.timeShift,
          alternateShift: proposed.alternateShift,
          weeklyOff: proposed.weeklyOff,
          joinDate: proposed.joinDate,
          biometricId: proposed.biometricId,
          status: proposed.status ?? 'Active',
          pan: proposed.pan ?? '',
          aadhaar: proposed.aadhaar ?? '',
          bankAccountNumber: proposed.bankAccountNumber ?? '',
          ifsc: proposed.ifsc ?? '',
          accountHolderName: proposed.accountHolderName ?? '',
          accountType: proposed.accountType ?? 'Savings',
          bankName: proposed.bankName ?? '',
          pfNumber: proposed.pfNumber ?? '',
          esiNumber: proposed.esiNumber ?? '',
        });
      } else if (doc.changeType === 'update') {
        if (!doc.employeeId) throw new ApiError(400, 'missing_employee', 'No employee linked to this request');
        const proposed = doc.proposedData as Record<string, unknown>;
        const patch: Record<string, unknown> = {
          name: proposed.name,
          gender: proposed.gender,
          department: proposed.department,
          designation: proposed.designation,
          location: proposed.location,
          alternateShift: proposed.alternateShift,
          weeklyOff: proposed.weeklyOff,
          joinDate: proposed.joinDate,
          biometricId: proposed.biometricId,
          status: proposed.status,
        };
        if (body.timeShift) patch.timeShift = body.timeShift;
        for (const key of ['pan', 'aadhaar', 'bankAccountNumber', 'ifsc', 'bankName', 'accountHolderName', 'accountType', 'pfNumber', 'esiNumber'] as const) {
          if (proposed[key]) patch[key] = proposed[key];
        }
        await EmployeeModel.updateOne({ _id: doc.employeeId }, { $set: patch });
      } else if (doc.changeType === 'delete') {
        if (!doc.employeeId) throw new ApiError(400, 'missing_employee', 'No employee linked to this request');
        await EmployeeModel.updateOne(
          { _id: doc.employeeId },
          { $set: { isDeleted: true, deletedAt: new Date(), status: 'Inactive' } }
        );
      }
    }

    doc.status = body.decision === 'approve' ? 'Approved' : 'Rejected';
    doc.decidedBy = new Types.ObjectId(req.auth!.sub);
    doc.decidedAt = new Date();
    doc.decidedFromIp = req.clientIp ?? null;
    doc.approverNote = body.approverNote ?? null;
    await doc.save();

    await audit(
      body.decision === 'approve' ? 'employee_change_request_approved' : 'employee_change_request_rejected',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'employee_change_request', entityId: doc._id, payload: { changeType: doc.changeType, decision: body.decision } }
    );

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

export default router;
