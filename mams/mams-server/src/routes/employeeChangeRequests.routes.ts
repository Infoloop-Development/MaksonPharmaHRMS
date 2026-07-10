import { Router } from 'express';
import { Types } from 'mongoose';
import { EmployeeChangeRequestModel } from '../models/EmployeeChangeRequest.js';
import { EmployeeModel } from '../models/Employee.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.service.js';
import { allocateNextEmpCode } from '../services/employeeCode.service.js';
import { clearSoftDeleteFields, softDeleteFields } from '../utils/softDelete.util.js';
import {
  EmployeeChangeRequestBodySchema,
  EmployeeChangeRequestReviewSchema,
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
        .populate('employeeId', 'name empCode isDeleted')
        .populate('initiatedBy', 'name email')
        .populate('reviewedBy', 'name email')
        .sort({ initiatedAt: -1 })
        .skip((q.page - 1) * q.pageSize)
        .limit(q.pageSize)
        .lean(),
      EmployeeChangeRequestModel.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const counts: Record<string, number> = { Flagged: 0, Reviewed: 0 };
    for (const c of statusCounts) counts[c._id as string] = c.count;

    res.json({ items, total, page: q.page, pageSize: q.pageSize, counts });
  } catch (err) {
    next(err);
  }
});

// Compliance submits a change — mutation applied immediately, then flagged for HR to review
router.post('/', requirePermission('write.employee_change'), async (req, res, next) => {
  try {
    const body = EmployeeChangeRequestBodySchema.parse(req.body);

    let employeeId: Types.ObjectId | null = null;
    let previousData: Record<string, unknown> | null = null;

    if (body.changeType === 'create') {
      // Derive timeShift from alternateShift: A/B → Day (daytime hours), C → Night (10PM–6AM)
      const timeShift = body.proposedData.alternateShift === 'C' ? 'Night' : 'Day';
      const empCode = await allocateNextEmpCode();
      const p = body.proposedData;
      const newEmp = await EmployeeModel.create({
        empCode,
        name: p.name,
        gender: p.gender,
        department: p.department,
        designation: p.designation,
        location: p.location,
        timeShift,
        alternateShift: p.alternateShift,
        weeklyOff: p.weeklyOff,
        joinDate: p.joinDate,
        biometricId: p.biometricId,
        status: p.status ?? 'Active',
        pan: p.pan ?? '',
        aadhaar: p.aadhaar ?? '',
        bankAccountNumber: p.bankAccountNumber ?? '',
        ifsc: p.ifsc ?? '',
        accountHolderName: p.accountHolderName ?? '',
        accountType: p.accountType ?? 'Savings',
        bankName: p.bankName ?? '',
        pfNumber: p.pfNumber ?? '',
        esiNumber: p.esiNumber ?? '',
      });
      employeeId = newEmp._id as Types.ObjectId;

    } else {
      if (!Types.ObjectId.isValid(body.employeeId)) {
        throw new ApiError(400, 'invalid_employee', 'Invalid employeeId');
      }
      const emp = await EmployeeModel.findOne({ _id: body.employeeId, isDeleted: { $ne: true } }).lean();
      if (!emp) throw new ApiError(404, 'not_found', 'Employee not found');
      employeeId = new Types.ObjectId(body.employeeId);
      const { _id, __v, ...rest } = emp as Record<string, unknown>;
      previousData = { id: String(_id), ...rest };

      if (body.changeType === 'update') {
        const p = body.proposedData;
        const patch: Record<string, unknown> = {
          name: p.name,
          gender: p.gender,
          department: p.department,
          designation: p.designation,
          location: p.location,
          alternateShift: p.alternateShift,
          weeklyOff: p.weeklyOff,
          joinDate: p.joinDate,
          biometricId: p.biometricId,
          status: p.status,
        };
        for (const key of ['pan','aadhaar','bankAccountNumber','ifsc','bankName','accountHolderName','accountType','pfNumber','esiNumber'] as const) {
          if (p[key] !== undefined) patch[key] = p[key];
        }
        await EmployeeModel.updateOne({ _id: employeeId }, { $set: patch });

        // Merge into an existing Flagged update record if one exists (keeps original previousData so revert always goes back to pre-all-edits state)
        const existingFlagged = await EmployeeChangeRequestModel.findOne({ employeeId, changeType: 'update', status: 'Flagged' });
        if (existingFlagged) {
          existingFlagged.proposedData = { ...(existingFlagged.proposedData as Record<string, unknown>), ...body.proposedData };
          existingFlagged.reason = `${existingFlagged.reason}\n\n${body.reason}`;
          existingFlagged.initiatedAt = new Date();
          existingFlagged.initiatedFromIp = req.clientIp ?? null;
          await existingFlagged.save();
          await audit(
            'employee_change_applied',
            { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
            { entityType: 'employee_change_request', entityId: existingFlagged._id, payload: { changeType: 'update', employeeId: employeeId?.toString() ?? null, merged: true } }
          );
          res.status(200).json(existingFlagged);
          return;
        }

      } else {
        await EmployeeModel.updateOne(
          { _id: employeeId },
          { $set: { isDeleted: true, deletedAt: new Date(), status: 'Inactive' } }
        );
      }
    }

    const record = await EmployeeChangeRequestModel.create({
      changeType: body.changeType,
      employeeId,
      proposedData: body.changeType !== 'delete' ? body.proposedData : null,
      previousData,
      reason: body.reason,
      status: 'Flagged',
      initiatedBy: new Types.ObjectId(req.auth!.sub),
      initiatedAt: new Date(),
      initiatedFromIp: req.clientIp ?? null,
    });

    await audit(
      'employee_change_applied',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'employee_change_request', entityId: record._id, payload: { changeType: body.changeType, employeeId: employeeId?.toString() ?? null } }
    );

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// When HR reverses what a compliance user submitted (remove/revert/reinstate), we log a plain
// follow-up entry attributed to that same submitter so their Update Log never goes out of sync
// with the Employees list — without ever exposing that a second reviewer stepped in.
async function logFollowUp(params: {
  changeType: 'create' | 'update' | 'delete';
  employeeId: Types.ObjectId;
  previousData: Record<string, unknown> | null;
  proposedData: Record<string, unknown> | null;
  initiatedBy: Types.ObjectId;
  reviewedBy: Types.ObjectId;
  reason: string;
}) {
  await EmployeeChangeRequestModel.create({
    changeType: params.changeType,
    employeeId: params.employeeId,
    proposedData: params.proposedData,
    previousData: params.previousData,
    reason: params.reason,
    status: 'Reviewed',
    initiatedBy: params.initiatedBy,
    initiatedAt: new Date(),
    reviewedBy: params.reviewedBy,
    reviewedAt: new Date(),
    reviewNote: null,
  });
}

// HR reviews a flagged action — optionally corrects timeShift for compliance-created employees
router.post('/:id/review', requirePermission('approve.employee_change'), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Request not found');

    const body = EmployeeChangeRequestReviewSchema.parse(req.body);
    const doc = await EmployeeChangeRequestModel.findOne({ _id: id, status: 'Flagged' });
    if (!doc) throw new ApiError(404, 'not_found', 'Flagged change request not found');

    if (body.action === 'keep'){
      if (doc.changeType === 'create' && body.timeShift && doc.employeeId){
        await EmployeeModel.updateOne({ _id: doc.employeeId }, {$set: { timeShift: body.timeShift }})
      }
      if (doc.changeType === 'delete' && doc.employeeId){
        await EmployeeChangeRequestModel.updateMany(
          { employeeId: doc.employeeId, _id: { $ne: doc._id }, status: 'Flagged'},
          { $set: { status: 'Reviewed', reviewNote: 'Auto-closed: employee was confirmed deleted.'}}
        );
      }
    } else if (body.action === 'remove'){
      if (doc.changeType !== 'create') throw new ApiError(400, 'invalid_action','remove is only valid for create requests');
      if (!doc.employeeId) throw new ApiError(400, 'missing_employee', 'No employee linked to this request');
      const empBefore = await EmployeeModel.findOne({ _id: doc.employeeId }).lean();
      await EmployeeModel.updateOne(
        { _id: doc.employeeId },
        { $set: { isDeleted: true, status: 'Inactive', ...softDeleteFields(req.auth!.sub) } }
      );
      if (empBefore) {
        const { _id, __v, ...rest } = empBefore as Record<string, unknown>;
        await logFollowUp({
          changeType: 'delete',
          employeeId: doc.employeeId,
          previousData: { id: String(_id), ...rest },
          proposedData: null,
          initiatedBy: doc.initiatedBy,
          reviewedBy: new Types.ObjectId(req.auth!.sub),
          reason: 'Employee record deactivated.',
        });
      }
    } else if (body.action === 'revert') {
      if (doc.changeType !== 'update') throw new ApiError(400, 'invalid_action', 'revert is only valid for update requests');
      if (!doc.employeeId || !doc.previousData) throw new ApiError(400, 'missing_data','No previous data to revert to');
      const empCheck = await EmployeeModel.findOne({ _id: doc.employeeId }).select('isDeleted').lean();
      if (empCheck?.isDeleted) {
        throw new ApiError(409, 'employee_deleted', 'Employee has been deleted — resolve the deletion record first.');
      }
      const prev = doc.previousData as Record<string, unknown>;
      const restoreFields = [
        'name','gender','department','designation','location','alternateShift',
        'weeklyOff','joinDate','biometricId','status','pan','aadhaar',
        'bankAccountNumber','ifsc','bankName','accountHolderName','accountType',
        'pfNumber','esiNumber',
      ];
      const restore: Record<string,unknown> = {}
      for (const key of restoreFields){
        if (prev[key] !== undefined) restore[key] = prev[key];
      }
      const empBefore = await EmployeeModel.findOne({ _id: doc.employeeId }).lean();
      await EmployeeModel.updateOne({ _id: doc.employeeId}, {$set: restore});
      if (empBefore) {
        const { _id, __v, ...rest } = empBefore as Record<string, unknown>;
        await logFollowUp({
          changeType: 'update',
          employeeId: doc.employeeId,
          previousData: { id: String(_id), ...rest },
          proposedData: restore,
          initiatedBy: doc.initiatedBy,
          reviewedBy: new Types.ObjectId(req.auth!.sub),
          reason: 'Follow-up correction to employee record.',
        });
      }
    } else if (body.action === 'reinstate'){
      if (doc.changeType !== 'delete') throw new ApiError(400, 'invalid_action', 'reinstate is only valid for delete requests');
      if (!doc.employeeId || !doc.previousData) throw new ApiError(400, 'missing_data', 'No previous data to reinstate from');
      const prev = doc.previousData as Record<string, unknown>;
      const empBefore = await EmployeeModel.findOne({ _id: doc.employeeId }).lean();
      const reinstatedStatus = prev.status ?? 'Active';
      await EmployeeModel.updateOne(
        { _id: doc.employeeId },
        { $set: { isDeleted: false, status: reinstatedStatus, ...clearSoftDeleteFields() } }
      );
      if (empBefore) {
        const { _id, __v, ...rest } = empBefore as Record<string, unknown>;
        await logFollowUp({
          changeType: 'update',
          employeeId: doc.employeeId,
          previousData: { id: String(_id), ...rest },
          proposedData: { status: reinstatedStatus },
          initiatedBy: doc.initiatedBy,
          reviewedBy: new Types.ObjectId(req.auth!.sub),
          reason: 'Employee record reactivated.',
        });
      }
    }

    doc.status = 'Reviewed';
    doc.reviewedBy = new Types.ObjectId(req.auth!.sub);
    doc.reviewedAt = new Date();
    doc.reviewedFromIp = req.clientIp ?? null;
    doc.reviewNote = body.reviewNote ?? null;
    await doc.save();

    await audit(
      'employee_change_reviewed',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'employee_change_request', entityId: doc._id, payload: { changeType: doc.changeType, employeeId: doc.employeeId?.toString() ?? null } }
    );

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

export default router;
