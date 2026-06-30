import { Router } from 'express';
import { Types } from 'mongoose';
import {
  DEFAULT_LEAVE_TYPES,
  HolidayCreateSchema,
  HolidayPatchSchema,
  LeaveApplicationCreateSchema,
  LeaveDecisionSchema,
  LeaveListQuerySchema,
  LeaveQuotaAdjustSchema,
  LeaveQuotaApplyDefaultSchema,
  LeaveQuotaPreviewQuerySchema,
  LeaveRejectSchema,
  LeaveTypeCreateSchema,
  LeaveTypePatchSchema,
  BulkIdsBodySchema,
} from '@mams/types';
import type { Permission } from '@mams/types';
import { resolveLeaveAdminApply } from '@mams/types';
import { parseSortQuery } from '../utils/sortQuery.js';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../services/audit.service.js';
import { LeaveApplicationModel } from '../models/LeaveApplication.js';
import { LeaveTypeModel } from '../models/LeaveType.js';
import { HolidayModel } from '../models/Holiday.js';
import { LeaveQuotaModel } from '../models/LeaveQuota.js';
import { LeaveQuotaLedgerModel } from '../models/LeaveQuotaLedger.js';
import { EmployeeModel } from '../models/Employee.js';
import { SettingsModel } from '../models/Settings.js';
import { buildExportFileName } from '../services/exportFileName.service.js';
import { buildPlainXlsxBuffer, XLSX_CONTENT_TYPE } from '../services/plainXlsx.service.js';
import {
  brandingFromSettingsDoc,
  buildCsvFooter,
  buildCsvPreamble,
  joinCsvDocument,
} from '../services/exportBranding.service.js';
import { calculateLeaveDays } from '../services/leave/leaveDayCalculator.service.js';
import { hasOverlappingLeave } from '../services/leave/leaveOverlap.service.js';
import {
  applyDefaultQuotaPolicy,
  applyQuotaDelta,
  consumeQuotaForLeave,
  getOrCreateQuota,
  restoreQuotaForLeave,
} from '../services/leave/leaveQuota.service.js';
import { getLeaveSummary } from '../services/leave/leaveSummary.service.js';
import { notifyLeaveApplied } from '../services/leave/leaveNotification.service.js';
import {
  buildLeaveAppliedNotification,
  notifyOrgAdmins,
} from '../services/notification.service.js';
import { eachDateInRange } from '../services/leave/leaveDate.util.js';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

function requireMongoId(id: string | undefined): string {
  if (!id || !Types.ObjectId.isValid(id)) throw new ApiError(400, 'invalid_id', 'Invalid id');
  return id;
}

function mapLeaveType(doc: { _id: Types.ObjectId; [k: string]: unknown }) {
  return {
    id: String(doc._id),
    code: doc.code,
    name: doc.name,
    paid: doc.paid,
    halfDayEligible: doc.halfDayEligible,
    maxConsecutiveDays: doc.maxConsecutiveDays ?? null,
    requiresDocument: doc.requiresDocument,
    annualQuotaDefault: doc.annualQuotaDefault,
    active: doc.active,
    sortOrder: doc.sortOrder ?? 0,
  };
}

function mapHoliday(doc: { _id: Types.ObjectId; [k: string]: unknown }) {
  return {
    id: String(doc._id),
    name: doc.name,
    date: doc.date,
    type: doc.type,
    departments: doc.departments ?? [],
    locations: doc.locations ?? [],
  };
}

async function holidaysInRange(from: string, to: string) {
  return HolidayModel.find({
    date: { $gte: from, $lte: to },
  }).lean();
}

router.get('/summary', async (_req, res, next) => {
  try {
    res.json(await getLeaveSummary());
  } catch (err) {
    next(err);
  }
});

router.get('/types', async (_req, res, next) => {
  try {
    const items = await LeaveTypeModel.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ items: items.map(mapLeaveType) });
  } catch (err) {
    next(err);
  }
});

router.post('/types', requirePermission('manage.leave'), async (req, res, next) => {
  try {
    const body = LeaveTypeCreateSchema.parse(req.body);
    const created = await LeaveTypeModel.create(body);
    await audit(
      'leave_type_created',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'leave_type', entityId: created._id, payload: { name: body.name } }
    );
    res.status(201).json(mapLeaveType(created.toObject()));
  } catch (err) {
    next(err);
  }
});

router.patch('/types/:id', requirePermission('manage.leave'), async (req, res, next) => {
  try {
    const id = requireMongoId(req.params.id);
    const body = LeaveTypePatchSchema.parse(req.body);
    const updated = await LeaveTypeModel.findByIdAndUpdate(id, { $set: body }, { new: true });
    if (!updated) throw new ApiError(404, 'not_found', 'Leave type not found');
    res.json(mapLeaveType(updated.toObject()));
  } catch (err) {
    next(err);
  }
});

router.get('/holidays', async (req, res, next) => {
  try {
    const year = req.query.year ? String(req.query.year) : undefined;
    const filter: Record<string, unknown> = {};
    if (year && /^\d{4}$/.test(year)) {
      filter.date = { $gte: `${year}-01-01`, $lte: `${year}-12-31` };
    }
    const items = await HolidayModel.find(filter).sort({ date: 1 }).lean();
    res.json({ items: items.map(mapHoliday) });
  } catch (err) {
    next(err);
  }
});

router.post('/holidays', requirePermission('manage.leave'), async (req, res, next) => {
  try {
    const body = HolidayCreateSchema.parse(req.body);
    const created = await HolidayModel.create(body);
    await audit(
      'holiday_created',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'holiday', entityId: created._id, payload: { name: body.name, date: body.date } }
    );
    res.status(201).json(mapHoliday(created.toObject()));
  } catch (err) {
    next(err);
  }
});

router.patch('/holidays/:id', requirePermission('manage.leave'), async (req, res, next) => {
  try {
    const id = requireMongoId(req.params.id);
    const body = HolidayPatchSchema.parse(req.body);
    const updated = await HolidayModel.findByIdAndUpdate(id, { $set: body }, { new: true });
    if (!updated) throw new ApiError(404, 'not_found', 'Holiday not found');
    res.json(mapHoliday(updated.toObject()));
  } catch (err) {
    next(err);
  }
});

router.post('/holidays/bulk-delete', requirePermission('manage.leave'), async (req, res, next) => {
  try {
    const body = BulkIdsBodySchema.parse(req.body);
    const result = { succeeded: 0, skipped: 0, errors: [] as Array<{ id: string; reason: string }> };

    for (const id of body.ids) {
      try {
        const mongoId = requireMongoId(id);
        const deleted = await HolidayModel.findByIdAndDelete(mongoId);
        if (!deleted) {
          result.skipped += 1;
          result.errors.push({ id, reason: 'Holiday not found' });
          continue;
        }
        result.succeeded += 1;
      } catch {
        result.skipped += 1;
        result.errors.push({ id, reason: 'Invalid id' });
      }
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/holidays/:id', requirePermission('manage.leave'), async (req, res, next) => {
  try {
    const id = requireMongoId(req.params.id);
    const deleted = await HolidayModel.findByIdAndDelete(id);
    if (!deleted) throw new ApiError(404, 'not_found', 'Holiday not found');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post('/holidays/import-csv', requirePermission('manage.leave'), async (req, res, next) => {
  try {
    const rows = z.array(HolidayCreateSchema).min(1).parse(req.body.rows);
    const created = await HolidayModel.insertMany(rows);
    res.json({ imported: created.length });
  } catch (err) {
    next(err);
  }
});

router.get('/quota/preview', async (req, res, next) => {
  try {
    const q = LeaveQuotaPreviewQuerySchema.parse(req.query);
    const leaveType = await LeaveTypeModel.findById(q.leaveTypeId).lean();
    if (!leaveType) throw new ApiError(404, 'not_found', 'Leave type not found');
    const balance = await getOrCreateQuota(q.employeeId, q.leaveTypeId, q.asOfDate ?? new Date().toISOString().slice(0, 10));
    res.json({
      ...balance,
      paid: leaveType.paid,
      leaveTypeName: leaveType.name,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/quota', async (req, res, next) => {
  try {
    const employeeId = req.query.employeeId ? String(req.query.employeeId) : undefined;
    const filter: Record<string, unknown> = {};
    if (employeeId && Types.ObjectId.isValid(employeeId)) {
      filter.employeeId = new Types.ObjectId(employeeId);
    }
    const quotas = await LeaveQuotaModel.find(filter)
      .populate('employeeId', 'name empCode department')
      .populate('leaveTypeId', 'name code paid')
      .sort({ periodKey: -1 })
      .lean();

    const items = quotas.map((q) => {
      const entitled = (q.entitled ?? 0) + (q.manualAdjustment ?? 0);
      return {
        id: String(q._id),
        employeeId: q.employeeId,
        leaveTypeId: q.leaveTypeId,
        periodKey: q.periodKey,
        periodType: q.periodType,
        entitled: q.entitled,
        consumed: q.consumed,
        manualAdjustment: q.manualAdjustment,
        remaining: Math.max(0, entitled - (q.consumed ?? 0)),
      };
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post('/quota/adjust', requirePermission('manage.leave'), async (req, res, next) => {
  try {
    const body = LeaveQuotaAdjustSchema.parse(req.body);
    const balance = await applyQuotaDelta({
      employeeId: body.employeeId,
      leaveTypeId: body.leaveTypeId,
      asOfDate: new Date().toISOString().slice(0, 10),
      delta: body.delta,
      reason: body.reason,
      actorId: req.auth!.sub,
      consume: false,
    });
    await audit(
      'leave_quota_adjusted',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      {
        entityType: 'leave_quota',
        entityId: body.employeeId,
        payload: { leaveTypeId: body.leaveTypeId, delta: body.delta, reason: body.reason },
      }
    );
    res.json(balance);
  } catch (err) {
    next(err);
  }
});

router.post('/quota/apply-default-policy', requirePermission('manage.leave'), async (req, res, next) => {
  try {
    const body = LeaveQuotaApplyDefaultSchema.parse(req.body);
    const result = await applyDefaultQuotaPolicy({
      employeeIds: body.employeeIds,
      department: body.department,
      actorId: req.auth!.sub,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

async function buildApplicationListFilter(q: z.infer<typeof LeaveListQuerySchema>) {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.employeeId && Types.ObjectId.isValid(q.employeeId)) {
    filter.employeeId = new Types.ObjectId(q.employeeId);
  }
  if (q.leaveTypeId && Types.ObjectId.isValid(q.leaveTypeId)) {
    filter.leaveTypeId = new Types.ObjectId(q.leaveTypeId);
  }
  if (q.startDate || q.endDate) {
    if (q.startDate) filter.toDate = { ...(filter.toDate as object), $gte: q.startDate };
    if (q.endDate) filter.fromDate = { ...(filter.fromDate as object), $lte: q.endDate };
  }
  if (q.search?.trim()) {
    const employees = await EmployeeModel.find({
      $or: [
        { name: { $regex: q.search.trim(), $options: 'i' } },
        { empCode: { $regex: q.search.trim(), $options: 'i' } },
      ],
      isDeleted: { $ne: true },
    })
      .select('_id')
      .limit(100)
      .lean();
    filter.employeeId = { $in: employees.map((e) => e._id) };
  }
  return filter;
}

router.get('/applications', async (req, res, next) => {
  try {
    const q = LeaveListQuerySchema.parse(req.query);
    const filter = await buildApplicationListFilter(q);
    const sort = parseSortQuery(q.sortBy, q.sortDir, {
      fromDate: 'fromDate',
      totalDays: 'totalDays',
      status: 'status',
    }, { appliedAt: -1 });

    if (q.sortBy === 'employee') {
      const dir = q.sortDir === 'desc' ? -1 : 1;
      const skip = (q.page - 1) * q.pageSize;
      const [total, aggItems] = await Promise.all([
        LeaveApplicationModel.countDocuments(filter),
        LeaveApplicationModel.aggregate([
          { $match: filter },
          {
            $lookup: {
              from: 'employees',
              localField: 'employeeId',
              foreignField: '_id',
              as: 'emp',
            },
          },
          { $unwind: '$emp' },
          { $sort: { 'emp.name': dir, _id: 1 } },
          { $skip: skip },
          { $limit: q.pageSize },
          { $project: { emp: 0 } },
        ]),
      ]);
      const ids = aggItems.map((d) => d._id);
      const populated = await LeaveApplicationModel.find({ _id: { $in: ids } })
        .populate('employeeId', 'name empCode department location')
        .populate('leaveTypeId', 'name code paid halfDayEligible')
        .populate('appliedBy', 'name email')
        .populate('decidedBy', 'name email')
        .lean();
      const byId = new Map(populated.map((d) => [String(d._id), d]));
      const items = ids.map((id) => byId.get(String(id))).filter(Boolean);
      res.json({ items, total, page: q.page, pageSize: q.pageSize });
      return;
    }

    const [total, items] = await Promise.all([
      LeaveApplicationModel.countDocuments(filter),
      LeaveApplicationModel.find(filter)
        .populate('employeeId', 'name empCode department location')
        .populate('leaveTypeId', 'name code paid halfDayEligible')
        .populate('appliedBy', 'name email')
        .populate('decidedBy', 'name email')
        .sort(sort)
        .skip((q.page - 1) * q.pageSize)
        .limit(q.pageSize)
        .lean(),
    ]);
    res.json({ items, total, page: q.page, pageSize: q.pageSize });
  } catch (err) {
    next(err);
  }
});

router.get('/applications/export.xlsx', async (req, res, next) => {
  try {
    const q = LeaveListQuerySchema.parse({ ...req.query, pageSize: 5000 });
    const filter = await buildApplicationListFilter(q);
    const items = await LeaveApplicationModel.find(filter)
      .populate('employeeId', 'name empCode')
      .populate('leaveTypeId', 'name')
      .sort({ appliedAt: -1 })
      .limit(5000)
      .lean();

    const headers = [
      'Employee',
      'Emp Code',
      'Leave Type',
      'From',
      'To',
      'Total Days',
      'Status',
      'Reason',
    ];
    const dataRows = items.map((row) => {
      const emp = row.employeeId as { name?: string; empCode?: string } | null;
      const lt = row.leaveTypeId as { name?: string } | null;
      return [
        emp?.name ?? '',
        emp?.empCode ?? '',
        lt?.name ?? '',
        row.fromDate,
        row.toDate,
        row.totalDays,
        row.status,
        row.reason ?? '',
      ];
    });

    const settingsDoc = await SettingsModel.findOne().lean();
    const filename = buildExportFileName(
      'leaveApplicationsCsv',
      { companyName: settingsDoc?.companyName },
      settingsDoc?.exportNaming,
      settingsDoc?.companyName
    );

    const buffer = buildPlainXlsxBuffer(headers, dataRows, 'Leave');
    res.setHeader('Content-Type', XLSX_CONTENT_TYPE);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.get('/applications/export.csv', async (req, res, next) => {
  try {
    const q = LeaveListQuerySchema.parse({ ...req.query, pageSize: 5000 });
    const filter = await buildApplicationListFilter(q);
    const items = await LeaveApplicationModel.find(filter)
      .populate('employeeId', 'name empCode')
      .populate('leaveTypeId', 'name')
      .sort({ appliedAt: -1 })
      .limit(5000)
      .lean();

    const dataLines = [
      'Employee,EmpCode,LeaveType,FromDate,ToDate,TotalDays,Status,Reason',
      ...items.map((row) => {
        const emp = row.employeeId as { name?: string; empCode?: string } | null;
        const lt = row.leaveTypeId as { name?: string } | null;
        const reason = String(row.reason ?? '').replace(/"/g, '""');
        return `"${emp?.name ?? ''}","${emp?.empCode ?? ''}","${lt?.name ?? ''}","${row.fromDate}","${row.toDate}",${row.totalDays},"${row.status}","${reason}"`;
      }),
    ];

    const settingsDoc = await SettingsModel.findOne().lean();
    const branding = brandingFromSettingsDoc(settingsDoc);
    const csv = [
      ...buildCsvPreamble(branding, { reportType: 'Leave Applications Report' }),
      '',
      ...dataLines,
      '',
      ...buildCsvFooter(branding),
    ];

    const filename = buildExportFileName(
      'leaveApplicationsCsv',
      { companyName: settingsDoc?.companyName },
      settingsDoc?.exportNaming,
      settingsDoc?.companyName
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(joinCsvDocument(csv));
  } catch (err) {
    next(err);
  }
});

router.get('/applications/:id', async (req, res, next) => {
  try {
    const id = requireMongoId(req.params.id);
    const item = await LeaveApplicationModel.findById(id)
      .populate('employeeId', 'name empCode department location')
      .populate('leaveTypeId', 'name code paid')
      .populate('appliedBy', 'name email')
      .populate('decidedBy', 'name email')
      .lean();
    if (!item) throw new ApiError(404, 'not_found', 'Leave application not found');

    const ledger = await LeaveQuotaLedgerModel.find({
      relatedApplicationId: item._id,
    })
      .sort({ occurredAt: -1 })
      .limit(10)
      .lean();

    res.json({ ...item, ledger });
  } catch (err) {
    next(err);
  }
});

router.post('/applications', requireAnyPermission('write.leave', 'manage.leave'), async (req, res, next) => {
  try {
    const body = LeaveApplicationCreateSchema.parse(req.body);
    const perms = req.auth!.permissions as Permission[];
    const adminApplyResult = resolveLeaveAdminApply(perms, body.adminApply);
    if ('error' in adminApplyResult) {
      throw new ApiError(403, 'forbidden', 'You do not have permission to auto-approve leave applications');
    }
    const adminApply = adminApplyResult.adminApply;
    if (!Types.ObjectId.isValid(body.employeeId)) throw new ApiError(400, 'invalid_employee', 'Invalid employee');
    if (!Types.ObjectId.isValid(body.leaveTypeId)) throw new ApiError(400, 'invalid_type', 'Invalid leave type');

    const [employee, leaveType] = await Promise.all([
      EmployeeModel.findById(body.employeeId).lean(),
      LeaveTypeModel.findById(body.leaveTypeId).lean(),
    ]);
    if (!employee) throw new ApiError(404, 'not_found', 'Employee not found');
    if (!leaveType || !leaveType.active) throw new ApiError(404, 'not_found', 'Leave type not found');

    if (body.halfDayPortion && !leaveType.halfDayEligible) {
      throw new ApiError(400, 'half_day_not_allowed', 'This leave type does not support half day');
    }

    if (
      leaveType.maxConsecutiveDays &&
      !body.halfDayPortion &&
      eachDateInRange(body.fromDate, body.toDate).length > leaveType.maxConsecutiveDays
    ) {
      throw new ApiError(400, 'max_consecutive', `Maximum ${leaveType.maxConsecutiveDays} consecutive days`);
    }

    const overlap = await hasOverlappingLeave(body.employeeId, body.fromDate, body.toDate);
    if (overlap) throw new ApiError(409, 'overlap', 'Overlapping leave exists for this employee');

    const holidays = await holidaysInRange(body.fromDate, body.toDate);
    const { totalDays, excludedHolidayDates } = calculateLeaveDays({
      fromDate: body.fromDate,
      toDate: body.toDate,
      halfDayPortion: body.halfDayPortion,
      department: employee.department,
      location: employee.location,
      holidays,
    });

    if (totalDays <= 0 && leaveType.paid) {
      throw new ApiError(400, 'no_leave_days', 'No chargeable leave days in selected range');
    }

    const status = adminApply ? 'Approved' : 'Pending';

    const created = await LeaveApplicationModel.create({
      employeeId: new Types.ObjectId(body.employeeId),
      leaveTypeId: new Types.ObjectId(body.leaveTypeId),
      fromDate: body.fromDate,
      toDate: body.toDate,
      totalDays,
      halfDayPortion: body.halfDayPortion ?? null,
      reason: body.reason,
      status,
      appliedBy: new Types.ObjectId(req.auth!.sub),
      appliedAt: new Date(),
      decidedBy: status === 'Approved' ? new Types.ObjectId(req.auth!.sub) : null,
      decidedAt: status === 'Approved' ? new Date() : null,
      notifyEmployee: body.notifyEmployee,
      excludedHolidayDates,
    });

    if (status === 'Approved') {
      await consumeQuotaForLeave({
        employeeId: body.employeeId,
        leaveTypeId: body.leaveTypeId,
        fromDate: body.fromDate,
        days: totalDays,
        paid: leaveType.paid,
        actorId: req.auth!.sub,
        applicationId: String(created._id),
      });
    }

    if (body.notifyEmployee) {
      await notifyLeaveApplied({
        employeeId: body.employeeId,
        leaveTypeName: leaveType.name,
        fromDate: body.fromDate,
        toDate: body.toDate,
        status,
        totalDays,
      });
    }

    await audit(
      'leave_applied',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      {
        entityType: 'leave_application',
        entityId: created._id,
        payload: { employeeId: body.employeeId, status, totalDays },
      }
    );

    await notifyOrgAdmins(
      buildLeaveAppliedNotification({
        employeeName: employee.name,
        status,
        totalDays,
        entityId: created._id,
      })
    );

    const populated = await LeaveApplicationModel.findById(created._id)
      .populate('employeeId', 'name empCode department location')
      .populate('leaveTypeId', 'name code paid')
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

router.patch('/applications/:id/approve', requireAnyPermission('approve.leave', 'manage.leave'), async (req, res, next) => {
  try {
    const id = requireMongoId(req.params.id);
    const body = LeaveDecisionSchema.parse(req.body);
    const app = await LeaveApplicationModel.findById(id);
    if (!app) throw new ApiError(404, 'not_found', 'Leave application not found');
    if (app.status !== 'Pending') throw new ApiError(400, 'invalid_status', 'Only pending leaves can be approved');

    const leaveType = await LeaveTypeModel.findById(app.leaveTypeId).lean();
    if (!leaveType) throw new ApiError(404, 'not_found', 'Leave type not found');

    app.status = 'Approved';
    app.decidedBy = new Types.ObjectId(req.auth!.sub);
    app.decidedAt = new Date();
    app.approverNote = body.note ?? null;
    await app.save();

    await consumeQuotaForLeave({
      employeeId: String(app.employeeId),
      leaveTypeId: String(app.leaveTypeId),
      fromDate: app.fromDate,
      days: app.totalDays,
      paid: leaveType.paid,
      actorId: req.auth!.sub,
      applicationId: String(app._id),
    });

    await audit(
      'leave_approved',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'leave_application', entityId: app._id, payload: { note: body.note } }
    );

    res.json(app);
  } catch (err) {
    next(err);
  }
});

router.patch('/applications/:id/reject', requireAnyPermission('approve.leave', 'manage.leave'), async (req, res, next) => {
  try {
    const id = requireMongoId(req.params.id);
    const body = LeaveRejectSchema.parse(req.body);
    const app = await LeaveApplicationModel.findById(id);
    if (!app) throw new ApiError(404, 'not_found', 'Leave application not found');
    if (app.status !== 'Pending') throw new ApiError(400, 'invalid_status', 'Only pending leaves can be rejected');

    app.status = 'Rejected';
    app.decidedBy = new Types.ObjectId(req.auth!.sub);
    app.decidedAt = new Date();
    app.approverNote = body.note;
    await app.save();

    await audit(
      'leave_rejected',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'leave_application', entityId: app._id, payload: { note: body.note } }
    );

    res.json(app);
  } catch (err) {
    next(err);
  }
});

router.patch('/applications/:id/cancel', requireAnyPermission('approve.leave', 'manage.leave'), async (req, res, next) => {
  try {
    const id = requireMongoId(req.params.id);
    const body = LeaveDecisionSchema.parse(req.body);
    const app = await LeaveApplicationModel.findById(id);
    if (!app) throw new ApiError(404, 'not_found', 'Leave application not found');
    if (!['Pending', 'Approved'].includes(app.status)) {
      throw new ApiError(400, 'invalid_status', 'Cannot cancel this leave');
    }

    const wasApproved = app.status === 'Approved';
    const leaveType = await LeaveTypeModel.findById(app.leaveTypeId).lean();

    app.status = 'Cancelled';
    app.cancelledBy = new Types.ObjectId(req.auth!.sub);
    app.cancelledAt = new Date();
    app.approverNote = body.note ?? app.approverNote;
    await app.save();

    if (wasApproved && leaveType) {
      await restoreQuotaForLeave({
        employeeId: String(app.employeeId),
        leaveTypeId: String(app.leaveTypeId),
        fromDate: app.fromDate,
        days: app.totalDays,
        paid: leaveType.paid,
        actorId: req.auth!.sub,
        applicationId: String(app._id),
      });
    }

    await audit(
      'leave_cancelled',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'leave_application', entityId: app._id, payload: { note: body.note } }
    );

    res.json(app);
  } catch (err) {
    next(err);
  }
});

router.get('/settings/policy', async (_req, res, next) => {
  try {
    const doc = await SettingsModel.findOne().select('leaveQuotaResetPolicy financialYearStartMonth').lean();
    res.json({
      leaveQuotaResetPolicy: doc?.leaveQuotaResetPolicy ?? 'calendar_year',
      financialYearStartMonth: doc?.financialYearStartMonth ?? 4,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/settings/policy', requirePermission('manage.leave'), async (req, res, next) => {
  try {
    const body = z
      .object({
        leaveQuotaResetPolicy: z.enum(['calendar_year', 'financial_year', 'joining_anniversary']).optional(),
        financialYearStartMonth: z.number().int().min(1).max(12).optional(),
      })
      .parse(req.body);
    const doc = await SettingsModel.findOneAndUpdate({}, { $set: body }, { new: true, upsert: true })
      .select('leaveQuotaResetPolicy financialYearStartMonth')
      .lean();
    res.json({
      leaveQuotaResetPolicy: doc?.leaveQuotaResetPolicy ?? 'calendar_year',
      financialYearStartMonth: doc?.financialYearStartMonth ?? 4,
    });
  } catch (err) {
    next(err);
  }
});

/** Seed default types if collection empty (dev convenience). */
router.post('/types/seed-defaults', requirePermission('manage.leave'), async (_req, res, next) => {
  try {
    const count = await LeaveTypeModel.countDocuments();
    if (count > 0) {
      res.json({ seeded: 0, message: 'Types already exist' });
      return;
    }
    const docs = DEFAULT_LEAVE_TYPES.map((t, i) => ({ ...t, sortOrder: i }));
    await LeaveTypeModel.insertMany(docs);
    res.json({ seeded: docs.length });
  } catch (err) {
    next(err);
  }
});

export default router;
