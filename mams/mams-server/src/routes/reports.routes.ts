import { Router } from 'express';
import { z } from 'zod';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { EmployeeModel } from '../models/Employee.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const FilterSchema = z.object({
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  department: z.string().optional(),
  location: z.string().optional(),
});

function buildAttendanceFilter(q: z.infer<typeof FilterSchema>) {
  const filter: Record<string, unknown> = {};
  if (q.date) filter.date = q.date;
  if (q.yearMonth) filter.date = { $regex: `^${q.yearMonth}` };
  if (q.startDate || q.endDate) {
    filter.date = {
      ...(q.startDate ? { $gte: q.startDate } : {}),
      ...(q.endDate ? { $lte: q.endDate } : {}),
    };
  }
  return filter;
}

async function buildEmployeeFilter(q: z.infer<typeof FilterSchema>) {
  const empFilter: Record<string, unknown> = { isDeleted: { $ne: true } };
  if (q.department) empFilter.department = q.department;
  if (q.location) empFilter.location = q.location;
  if (q.department || q.location) {
    const empIds = await EmployeeModel.find(empFilter).select('_id').lean();
    return empIds.map((e) => e._id);
  }
  return null;
}

// Project fields based on viewMode.
function projectionFor(viewMode: 'real' | 'compliant') {
  return viewMode === 'compliant'
    ? 'employeeId date compliantEntryAt compliantExitAt compliantHours dayType status'
    : 'employeeId date realEntryAt realExitAt realGrossHours realNetHours breakMinutes otHours dayType status';
}

// Daily Attendance Report
router.get('/daily', async (req, res, next) => {
  try {
    const q = FilterSchema.parse(req.query);
    const attFilter = buildAttendanceFilter(q);
    const empIds = await buildEmployeeFilter(q);
    if (empIds) attFilter.employeeId = { $in: empIds };

    const rows = await AttendanceDerivedModel.find(attFilter, projectionFor(req.auth!.viewMode))
      .populate('employeeId', 'name empCode department location timeShift alternateShift')
      .sort({ date: -1, 'employeeId.empCode': 1 })
      .limit(5000)
      .lean();

    const summary = summarise(rows);
    res.json({ viewMode: req.auth!.viewMode, summary, rows });
  } catch (err) {
    next(err);
  }
});

// Monthly Summary - groups by employee within the month
router.get('/monthly', async (req, res, next) => {
  try {
    const q = FilterSchema.parse(req.query);
    if (!q.yearMonth) {
      return res.status(400).json({ error: 'yearMonth required (YYYY-MM)' });
    }
    const attFilter = buildAttendanceFilter(q);
    const empIds = await buildEmployeeFilter(q);
    if (empIds) attFilter.employeeId = { $in: empIds };

    const rows = await AttendanceDerivedModel.aggregate([
      { $match: attFilter },
      {
        $group: {
          _id: '$employeeId',
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          weeklyOffDays: { $sum: { $cond: [{ $eq: ['$status', 'Weekly Off'] }, 1, 0] } },
          totalCompliantHours: { $sum: '$compliantHours' },
          totalRealNetHours: { $sum: '$realNetHours' },
          totalOtHours: { $sum: '$otHours' },
        },
      },
      { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'employee' } },
      { $unwind: '$employee' },
      {
        $project: {
          employeeId: '$_id',
          empCode: '$employee.empCode',
          name: '$employee.name',
          department: '$employee.department',
          location: '$employee.location',
          presentDays: 1,
          absentDays: 1,
          weeklyOffDays: 1,
          totalCompliantHours: 1,
          totalRealNetHours: 1,
          totalOtHours: 1,
          equivalentDays: { $divide: [req.auth!.viewMode === 'compliant' ? '$totalCompliantHours' : '$totalRealNetHours', 9.5] },
        },
      },
      { $sort: { empCode: 1 } },
      { $limit: 5000 },
    ]);

    return res.json({ viewMode: req.auth!.viewMode, yearMonth: q.yearMonth, rows });
  } catch (err) {
    return next(err);
  }
});

// Department-wise Report - aggregate by department within a period
router.get('/department', async (req, res, next) => {
  try {
    const q = FilterSchema.parse(req.query);
    const attFilter = buildAttendanceFilter(q);

    const rows = await AttendanceDerivedModel.aggregate([
      { $match: attFilter },
      { $lookup: { from: 'employees', localField: 'employeeId', foreignField: '_id', as: 'emp' } },
      { $unwind: '$emp' },
      ...(q.location ? [{ $match: { 'emp.location': q.location } }] : []),
      {
        $group: {
          _id: '$emp.department',
          totalRecords: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          weeklyOffDays: { $sum: { $cond: [{ $eq: ['$status', 'Weekly Off'] }, 1, 0] } },
          totalCompliantHours: { $sum: '$compliantHours' },
          totalRealNetHours: { $sum: '$realNetHours' },
          totalOtHours: { $sum: '$otHours' },
          uniqueEmployees: { $addToSet: '$employeeId' },
        },
      },
      {
        $project: {
          department: '$_id',
          totalRecords: 1,
          presentDays: 1,
          absentDays: 1,
          weeklyOffDays: 1,
          totalCompliantHours: 1,
          totalRealNetHours: 1,
          totalOtHours: 1,
          employeeCount: { $size: '$uniqueEmployees' },
          attendanceRate: {
            $multiply: [
              { $cond: [{ $gt: ['$totalRecords', 0] }, { $divide: ['$presentDays', '$totalRecords'] }, 0] },
              100,
            ],
          },
        },
      },
      { $sort: { department: 1 } },
    ]);

    res.json({ viewMode: req.auth!.viewMode, rows });
  } catch (err) {
    next(err);
  }
});

// Location-wise Report
router.get('/location', async (req, res, next) => {
  try {
    const q = FilterSchema.parse(req.query);
    const attFilter = buildAttendanceFilter(q);

    const rows = await AttendanceDerivedModel.aggregate([
      { $match: attFilter },
      { $lookup: { from: 'employees', localField: 'employeeId', foreignField: '_id', as: 'emp' } },
      { $unwind: '$emp' },
      ...(q.department ? [{ $match: { 'emp.department': q.department } }] : []),
      {
        $group: {
          _id: '$emp.location',
          totalRecords: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          totalCompliantHours: { $sum: '$compliantHours' },
          totalOtHours: { $sum: '$otHours' },
          uniqueEmployees: { $addToSet: '$employeeId' },
        },
      },
      {
        $project: {
          location: '$_id',
          totalRecords: 1,
          presentDays: 1,
          absentDays: 1,
          totalCompliantHours: 1,
          totalOtHours: 1,
          employeeCount: { $size: '$uniqueEmployees' },
          attendanceRate: {
            $multiply: [
              { $cond: [{ $gt: ['$totalRecords', 0] }, { $divide: ['$presentDays', '$totalRecords'] }, 0] },
              100,
            ],
          },
        },
      },
      { $sort: { location: 1 } },
    ]);

    res.json({ viewMode: req.auth!.viewMode, rows });
  } catch (err) {
    next(err);
  }
});

// CSV export of daily report
router.get('/daily.csv', async (req, res, next) => {
  try {
    const q = FilterSchema.parse(req.query);
    const attFilter = buildAttendanceFilter(q);
    const empIds = await buildEmployeeFilter(q);
    if (empIds) attFilter.employeeId = { $in: empIds };

    const rows = await AttendanceDerivedModel.find(attFilter, projectionFor(req.auth!.viewMode))
      .populate('employeeId', 'name empCode department location')
      .sort({ date: -1 })
      .limit(10000)
      .lean();

    const isCompliant = req.auth!.viewMode === 'compliant';
    const header = isCompliant
      ? ['Date', 'Code', 'Name', 'Department', 'Location', 'Entry (IST)', 'Exit (IST)', 'Hours', 'Status']
      : ['Date', 'Code', 'Name', 'Department', 'Location', 'Entry (IST)', 'Exit (IST)', 'Gross Hrs', 'Net Hrs', 'OT Hrs', 'Status'];

    const csv = [header.join(',')];
    for (const r of rows) {
      const emp = r.employeeId as any;
      const entry = isCompliant ? (r as any).compliantEntryAt : (r as any).realEntryAt;
      const exit = isCompliant ? (r as any).compliantExitAt : (r as any).realExitAt;
      const row = isCompliant
        ? [
            r.date,
            emp?.empCode ?? '',
            csvEscape(emp?.name ?? ''),
            csvEscape(emp?.department ?? ''),
            csvEscape(emp?.location ?? ''),
            entry ? new Date(entry).toISOString() : '',
            exit ? new Date(exit).toISOString() : '',
            (r as any).compliantHours ?? '',
            r.status,
          ]
        : [
            r.date,
            emp?.empCode ?? '',
            csvEscape(emp?.name ?? ''),
            csvEscape(emp?.department ?? ''),
            csvEscape(emp?.location ?? ''),
            entry ? new Date(entry).toISOString() : '',
            exit ? new Date(exit).toISOString() : '',
            (r as any).realGrossHours ?? '',
            (r as any).realNetHours ?? '',
            (r as any).otHours ?? '',
            r.status,
          ];
      csv.push(row.join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mams-daily-${Date.now()}.csv"`);
    res.send(csv.join('\n'));
  } catch (err) {
    next(err);
  }
});

function csvEscape(s: string) {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function summarise(rows: any[]) {
  const out = { total: rows.length, present: 0, absent: 0, weeklyOff: 0, halfDay: 0 };
  for (const r of rows) {
    if (r.status === 'Present') out.present += 1;
    else if (r.status === 'Absent') out.absent += 1;
    else if (r.status === 'Weekly Off') out.weeklyOff += 1;
    else if (r.status === 'Half Day') out.halfDay += 1;
  }
  return out;
}

export default router;
