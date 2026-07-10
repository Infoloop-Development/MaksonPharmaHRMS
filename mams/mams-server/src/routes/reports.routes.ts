import { Router, type Response } from 'express';
import { z } from 'zod';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { EmployeeModel } from '../models/Employee.js';
import { requireAuth } from '../middleware/auth.js';
import { SettingsModel } from '../models/Settings.js';
import { buildExportFileName } from '../services/exportFileName.service.js';
import { buildPlainXlsxBuffer, XLSX_CONTENT_TYPE } from '../services/plainXlsx.service.js';
import { utcToIstTimeString } from '../utils/time.js';
import {
  brandingFromSettingsDoc,
  buildCsvFooter,
  buildCsvPreamble,
  formatExportGeneratedDate,
  joinCsvDocument,
} from '../services/exportBranding.service.js';

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

function formatExportDateTime(value: Date | string | null | undefined): string {
  if (!value) return '';
  return utcToIstTimeString(new Date(value));
}

function sendPlainXlsx(
  res: Response,
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  sheetName = 'Data'
): void {
  const buffer = buildPlainXlsxBuffer(headers, rows, sheetName);
  res.setHeader('Content-Type', XLSX_CONTENT_TYPE);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

// Project fields based on viewMode.
function projectionFor(viewMode: 'real' | 'compliant') {
  return viewMode === 'compliant'
    ? 'employeeId date compliantEntryAt compliantExitAt compliantHours dayType status'
    : 'employeeId date realEntryAt realExitAt realGrossHours realNetHours breakMinutes otHours dayType status';
}

// Daily Attendance Report
const DAILY_REPORT_ROW_CAP = 5000;

router.get('/daily', async (req, res, next) => {
  try {
    const q = FilterSchema.parse(req.query);
    const attFilter = buildAttendanceFilter(q);
    const empIds = await buildEmployeeFilter(q);
    if (empIds) attFilter.employeeId = { $in: empIds };

    // The row list is capped for response size/performance, but the summary tiles and
    // truncation flag are computed from the full matching set - narrow date ranges used
    // to silently drop older dates from both the table AND the present/absent counts.
    const [rows, total, summaryAgg] = await Promise.all([
      AttendanceDerivedModel.find(attFilter, projectionFor(req.auth!.viewMode))
        .populate('employeeId', 'name empCode department location timeShift alternateShift')
        .sort({ date: -1, 'employeeId.empCode': 1 })
        .limit(DAILY_REPORT_ROW_CAP)
        .lean(),
      AttendanceDerivedModel.countDocuments(attFilter),
      AttendanceDerivedModel.aggregate<{
        _id: null;
        present: number;
        absent: number;
        weeklyOff: number;
        halfDay: number;
      }>([
        { $match: attFilter },
        {
          $group: {
            _id: null,
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
            weeklyOff: { $sum: { $cond: [{ $eq: ['$status', 'Weekly Off'] }, 1, 0] } },
            halfDay: { $sum: { $cond: [{ $eq: ['$status', 'Half Day'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const agg = summaryAgg[0] ?? { present: 0, absent: 0, weeklyOff: 0, halfDay: 0 };
    const summary = { total, present: agg.present, absent: agg.absent, weeklyOff: agg.weeklyOff, halfDay: agg.halfDay };

    res.json({
      viewMode: req.auth!.viewMode,
      summary,
      rows,
      total,
      truncated: total > rows.length,
    });
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
          equivalentDays: {
            $divide: [
              req.auth!.viewMode === 'compliant' ? '$totalCompliantHours' : '$totalRealNetHours',
              req.auth!.viewMode === 'compliant' ? 8 : 9.5,
            ],
          },
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

function formatReportDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return '';
  if (startDate && endDate && startDate === endDate) {
    return formatExportGeneratedDate(new Date(`${startDate}T00:00:00`));
  }
  const start = startDate ? formatExportGeneratedDate(new Date(`${startDate}T00:00:00`)) : '';
  const end = endDate ? formatExportGeneratedDate(new Date(`${endDate}T00:00:00`)) : '';
  if (start && end) return `${start} to ${end}`;
  return start || end;
}

// CSV export of daily report
router.get('/daily.csv', async (req, res, next) => {
  try {
    const q = FilterSchema.parse(req.query);
    const attFilter = buildAttendanceFilter(q);
    const empIds = await buildEmployeeFilter(q);
    if (empIds) attFilter.employeeId = { $in: empIds };

    const [rows, dailyCsvTotal] = await Promise.all([
      AttendanceDerivedModel.find(attFilter, projectionFor(req.auth!.viewMode))
        .populate('employeeId', 'name empCode department location')
        .sort({ date: -1 })
        .limit(10000)
        .lean(),
      AttendanceDerivedModel.countDocuments(attFilter),
    ]);

    const isCompliant = req.auth!.viewMode === 'compliant';
    const header = isCompliant
      ? ['Date', 'Code', 'Name', 'Department', 'Location', 'Entry (IST)', 'Exit (IST)', 'Hours', 'Status']
      : ['Date', 'Code', 'Name', 'Department', 'Location', 'Entry (IST)', 'Exit (IST)', 'Gross Hrs', 'Net Hrs', 'OT Hrs', 'Status'];

    const dataLines = [header.join(',')];
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
      dataLines.push(row.join(','));
    }

    const settingsDoc = await SettingsModel.findOne().lean();
    const branding = brandingFromSettingsDoc(settingsDoc);
    const csv = [
      ...buildCsvPreamble(branding, {
        reportType: 'Daily Attendance Report',
        dateRange: formatReportDateRange(q.startDate, q.endDate),
      }),
      '',
      ...dataLines,
      '',
      ...(dailyCsvTotal > rows.length
        ? [
            csvEscape(
              `NOTE: This export is limited to the first ${rows.length.toLocaleString()} of ${dailyCsvTotal.toLocaleString()} matching records. Narrow the date range for a complete export.`
            ),
            '',
          ]
        : []),
      ...buildCsvFooter(branding),
    ];

    const filename = buildExportFileName(
      'dailyReportCsv',
      {
        department: q.department,
        location: q.location,
        startDate: q.startDate,
        endDate: q.endDate,
        companyName: settingsDoc?.companyName,
      },
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

router.get('/daily.xlsx', async (req, res, next) => {
  try {
    const q = FilterSchema.parse(req.query);
    const attFilter = buildAttendanceFilter(q);
    const empIds = await buildEmployeeFilter(q);
    if (empIds) attFilter.employeeId = { $in: empIds };

    const [rows, dailyXlsxTotal] = await Promise.all([
      AttendanceDerivedModel.find(attFilter, projectionFor(req.auth!.viewMode))
        .populate('employeeId', 'name empCode department location')
        .sort({ date: -1 })
        .limit(10000)
        .lean(),
      AttendanceDerivedModel.countDocuments(attFilter),
    ]);

    const isCompliant = req.auth!.viewMode === 'compliant';
    const headers = isCompliant
      ? ['Date', 'Code', 'Name', 'Department', 'Location', 'Entry', 'Exit', 'Hours', 'Status']
      : ['Date', 'Code', 'Name', 'Department', 'Location', 'Entry', 'Exit', 'Net Hrs', 'OT', 'Status'];

    const dataRows = rows.map((r) => {
      const emp = r.employeeId as { name?: string; empCode?: string; department?: string; location?: string } | null;
      const entry = isCompliant ? (r as { compliantEntryAt?: Date }).compliantEntryAt : (r as { realEntryAt?: Date }).realEntryAt;
      const exit = isCompliant ? (r as { compliantExitAt?: Date }).compliantExitAt : (r as { realExitAt?: Date }).realExitAt;
      const base = [
        r.date,
        emp?.empCode ?? '',
        emp?.name ?? '',
        emp?.department ?? '',
        emp?.location ?? '',
        formatExportDateTime(entry),
        formatExportDateTime(exit),
      ];
      if (isCompliant) {
        return [...base, (r as { compliantHours?: number }).compliantHours ?? '', r.status ?? ''];
      }
      return [
        ...base,
        (r as { realNetHours?: number }).realNetHours ?? '',
        (r as { otHours?: number }).otHours ?? '',
        r.status ?? '',
      ];
    });

    if (dailyXlsxTotal > rows.length) {
      const note = `NOTE: This export is limited to the first ${rows.length.toLocaleString()} of ${dailyXlsxTotal.toLocaleString()} matching records. Narrow the date range for a complete export.`;
      dataRows.push([note, ...Array(headers.length - 1).fill('')]);
    }

    const settingsDoc = await SettingsModel.findOne().lean();
    const filename = buildExportFileName(
      'dailyReportCsv',
      {
        department: q.department,
        location: q.location,
        startDate: q.startDate,
        endDate: q.endDate,
        companyName: settingsDoc?.companyName,
      },
      settingsDoc?.exportNaming,
      settingsDoc?.companyName
    );
    sendPlainXlsx(res, headers, dataRows, filename, 'Daily');
  } catch (err) {
    next(err);
  }
});

router.get('/monthly.xlsx', async (req, res, next) => {
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
          equivalentDays: {
            $divide: [
              req.auth!.viewMode === 'compliant' ? '$totalCompliantHours' : '$totalRealNetHours',
              req.auth!.viewMode === 'compliant' ? 8 : 9.5,
            ],
          },
        },
      },
      { $sort: { empCode: 1 } },
      { $limit: 5000 },
    ]);

    const isCompliant = req.auth!.viewMode === 'compliant';
    const headers = [
      'Code',
      'Name',
      'Department',
      'Location',
      'Present',
      'Absent',
      'Weekly Off',
      'Total Hrs',
      'OT Hrs',
      'Equiv. Days',
    ];
    const dataRows = rows.map((r) => [
      r.empCode ?? '',
      r.name ?? '',
      r.department ?? '',
      r.location ?? '',
      r.presentDays ?? 0,
      r.absentDays ?? 0,
      r.weeklyOffDays ?? 0,
      isCompliant ? r.totalCompliantHours ?? '' : r.totalRealNetHours ?? '',
      r.totalOtHours ?? '',
      typeof r.equivalentDays === 'number' ? Number(r.equivalentDays.toFixed(1)) : '',
    ]);

    const settingsDoc = await SettingsModel.findOne().lean();
    const filename = buildExportFileName(
      'monthlyReportCsv',
      {
        department: q.department,
        location: q.location,
        asOfDate: `${q.yearMonth}-01`,
        companyName: settingsDoc?.companyName,
      },
      settingsDoc?.exportNaming,
      settingsDoc?.companyName
    );
    sendPlainXlsx(res, headers, dataRows, filename, 'Monthly');
  } catch (err) {
    next(err);
  }
});

router.get('/monthly.csv', async (req, res, next) => {
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
          equivalentDays: {
            $divide: [
              req.auth!.viewMode === 'compliant' ? '$totalCompliantHours' : '$totalRealNetHours',
              req.auth!.viewMode === 'compliant' ? 8 : 9.5,
            ],
          },
        },
      },
      { $sort: { empCode: 1 } },
      { $limit: 5000 },
    ]);

    const isCompliant = req.auth!.viewMode === 'compliant';
    const header = [
      'Code',
      'Name',
      'Department',
      'Location',
      'Present',
      'Absent',
      'Weekly Off',
      isCompliant ? 'Compliant Hrs' : 'Net Hrs',
      ...(isCompliant ? [] : ['OT Hrs']),
      'Equiv. Days',
    ];
    const dataLines = [header.join(',')];
    for (const r of rows) {
      const row = [
        r.empCode ?? '',
        csvEscape(r.name ?? ''),
        csvEscape(r.department ?? ''),
        csvEscape(r.location ?? ''),
        r.presentDays ?? 0,
        r.absentDays ?? 0,
        r.weeklyOffDays ?? 0,
        isCompliant ? r.totalCompliantHours ?? '' : r.totalRealNetHours ?? '',
        ...(isCompliant ? [] : [r.totalOtHours ?? '']),
        typeof r.equivalentDays === 'number' ? r.equivalentDays.toFixed(1) : '',
      ];
      dataLines.push(row.join(','));
    }

    const settingsDoc = await SettingsModel.findOne().lean();
    const branding = brandingFromSettingsDoc(settingsDoc);
    const csv = [
      ...buildCsvPreamble(branding, {
        reportType: 'Monthly Summary Report',
        period: q.yearMonth,
      }),
      '',
      ...dataLines,
      '',
      ...buildCsvFooter(branding),
    ];

    const filename = buildExportFileName(
      'monthlyReportCsv',
      {
        department: q.department,
        location: q.location,
        asOfDate: `${q.yearMonth}-01`,
        companyName: settingsDoc?.companyName,
      },
      settingsDoc?.exportNaming,
      settingsDoc?.companyName
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(joinCsvDocument(csv));
  } catch (err) {
    return next(err);
  }
});

router.get('/department.xlsx', async (req, res, next) => {
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
          presentDays: 1,
          absentDays: 1,
          weeklyOffDays: 1,
          totalCompliantHours: 1,
          totalOtHours: 1,
          employeeCount: { $size: '$uniqueEmployees' },
          totalRecords: 1,
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

    const headers = [
      'Department',
      'Employees',
      'Present',
      'Absent',
      'Weekly Off',
      'Compliant Hrs',
      'OT Hrs',
      'Attendance Rate %',
    ];
    const dataRows = rows.map((r) => [
      r.department ?? '',
      r.employeeCount ?? 0,
      r.presentDays ?? 0,
      r.absentDays ?? 0,
      r.weeklyOffDays ?? 0,
      r.totalCompliantHours ?? '',
      r.totalOtHours ?? '',
      typeof r.attendanceRate === 'number' ? Number(r.attendanceRate.toFixed(0)) : '',
    ]);

    const settingsDoc = await SettingsModel.findOne().lean();
    const filename = buildExportFileName(
      'departmentReportCsv',
      {
        asOfDate: q.yearMonth ? `${q.yearMonth}-01` : undefined,
        companyName: settingsDoc?.companyName,
      },
      settingsDoc?.exportNaming,
      settingsDoc?.companyName
    );
    sendPlainXlsx(res, headers, dataRows, filename, 'Department');
  } catch (err) {
    next(err);
  }
});

router.get('/department.csv', async (req, res, next) => {
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
          presentDays: 1,
          absentDays: 1,
          weeklyOffDays: 1,
          totalCompliantHours: 1,
          totalOtHours: 1,
          employeeCount: { $size: '$uniqueEmployees' },
          totalRecords: 1,
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

    const isDeptCompliant = req.auth!.viewMode === 'compliant';
    const header = [
      'Department',
      'Employees',
      'Present',
      'Absent',
      'Weekly Off',
      isDeptCompliant ? 'Compliant Hrs' : 'Net Hrs',
      ...(isDeptCompliant ? [] : ['OT Hrs']),
      'Attendance Rate %',
    ];
    const dataLines = [header.join(',')];
    for (const r of rows) {
      const row = [
        csvEscape(r.department ?? ''),
        r.employeeCount ?? 0,
        r.presentDays ?? 0,
        r.absentDays ?? 0,
        r.weeklyOffDays ?? 0,
        isDeptCompliant ? r.totalCompliantHours ?? '' : r.totalRealNetHours ?? r.totalCompliantHours ?? '',
        ...(isDeptCompliant ? [] : [r.totalOtHours ?? '']),
        typeof r.attendanceRate === 'number' ? r.attendanceRate.toFixed(0) : '',
      ];
      dataLines.push(row.join(','));
    }

    const settingsDoc = await SettingsModel.findOne().lean();
    const branding = brandingFromSettingsDoc(settingsDoc);
    const csv = [
      ...buildCsvPreamble(branding, {
        reportType: 'Department-wise Report',
        period: q.yearMonth ?? 'All periods',
      }),
      '',
      ...dataLines,
      '',
      ...buildCsvFooter(branding),
    ];

    const filename = buildExportFileName(
      'departmentReportCsv',
      {
        asOfDate: q.yearMonth ? `${q.yearMonth}-01` : undefined,
        companyName: settingsDoc?.companyName,
      },
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

router.get('/location.xlsx', async (req, res, next) => {
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

    const headers = [
      'Location',
      'Employees',
      'Present',
      'Absent',
      'Compliant Hrs',
      'OT Hrs',
      'Attendance Rate %',
    ];
    const dataRows = rows.map((r) => [
      r.location ?? '',
      r.employeeCount ?? 0,
      r.presentDays ?? 0,
      r.absentDays ?? 0,
      r.totalCompliantHours ?? '',
      r.totalOtHours ?? '',
      typeof r.attendanceRate === 'number' ? Number(r.attendanceRate.toFixed(0)) : '',
    ]);

    const settingsDoc = await SettingsModel.findOne().lean();
    const filename = buildExportFileName(
      'locationReportCsv',
      {
        asOfDate: q.yearMonth ? `${q.yearMonth}-01` : undefined,
        companyName: settingsDoc?.companyName,
      },
      settingsDoc?.exportNaming,
      settingsDoc?.companyName
    );
    sendPlainXlsx(res, headers, dataRows, filename, 'Location');
  } catch (err) {
    next(err);
  }
});

router.get('/location.csv', async (req, res, next) => {
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

    const isLocCompliant = req.auth!.viewMode === 'compliant';
    const header = [
      'Location',
      'Employees',
      'Present',
      'Absent',
      isLocCompliant ? 'Compliant Hrs' : 'Net Hrs',
      ...(isLocCompliant ? [] : ['OT Hrs']),
      'Attendance Rate %',
    ];
    const dataLines = [header.join(',')];
    for (const r of rows) {
      const row = [
        csvEscape(r.location ?? ''),
        r.employeeCount ?? 0,
        r.presentDays ?? 0,
        r.absentDays ?? 0,
        r.totalCompliantHours ?? '',
        ...(isLocCompliant ? [] : [r.totalOtHours ?? '']),
        typeof r.attendanceRate === 'number' ? r.attendanceRate.toFixed(0) : '',
      ];
      dataLines.push(row.join(','));
    }

    const settingsDoc = await SettingsModel.findOne().lean();
    const branding = brandingFromSettingsDoc(settingsDoc);
    const csv = [
      ...buildCsvPreamble(branding, {
        reportType: 'Location-wise Report',
        period: q.yearMonth ?? 'All periods',
      }),
      '',
      ...dataLines,
      '',
      ...buildCsvFooter(branding),
    ];

    const filename = buildExportFileName(
      'locationReportCsv',
      {
        asOfDate: q.yearMonth ? `${q.yearMonth}-01` : undefined,
        companyName: settingsDoc?.companyName,
      },
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

function csvEscape(s: string) {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}


export default router;
