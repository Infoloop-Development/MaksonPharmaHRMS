import { Router } from 'express';
import * as XLSX from 'xlsx';
import { DashboardAttendanceQuerySchema, DashboardKpiConfigSchema, DashboardLayoutSchema } from '@mams/types';
import { EmployeeModel } from '../models/Employee.js';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { DeviceModel } from '../models/Device.js';
import { AdjustmentModel } from '../models/Adjustment.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';
import {
  dashboardKpiAuditPayload,
  dashboardKpiChanged,
  dashboardLayoutAuditPayload,
  dashboardLayoutChangedFields,
} from '../services/dashboardActivity.service.js';
import { utcToIstDateString } from '../utils/time.js';
import { getDashboardCharts } from '../services/dashboard.service.js';
import { getDashboardLayout, saveDashboardLayout } from '../services/dashboardLayout.service.js';
import { getDashboardKpi, saveDashboardKpi } from '../services/dashboardKpi.service.js';
import {
  listDashboardAttendance,
  listDashboardAttendanceForExport,
  listDashboardDepartments,
  shiftLabel,
} from '../services/dashboardAttendance.service.js';
import { SettingsModel } from '../models/Settings.js';
import { buildExportFileName } from '../services/exportFileName.service.js';

const router = Router();
router.use(requireAuth);

router.get('/stats', async (_req, res, next) => {
  try {
    const today = utcToIstDateString(new Date());
    const [activeEmps, totalEmps, todayPresent, todayAbsent, devices, devicesOnline, pendingAdj] = await Promise.all([
      EmployeeModel.countDocuments({ status: 'Active', isDeleted: { $ne: true } }),
      EmployeeModel.countDocuments({ isDeleted: { $ne: true } }),
      AttendanceDerivedModel.countDocuments({ date: today, status: 'Present' }),
      AttendanceDerivedModel.countDocuments({ date: today, status: 'Absent' }),
      DeviceModel.countDocuments({ isActive: true }),
      DeviceModel.countDocuments({
        isActive: true,
        lastPingAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      }),
      AdjustmentModel.countDocuments({ status: 'Pending' }),
    ]);

    res.json({
      asOfDate: today,
      employees: { active: activeEmps, total: totalEmps },
      attendanceToday: {
        present: todayPresent,
        absent: todayAbsent,
        attendanceRate: activeEmps > 0 ? Math.round((todayPresent / activeEmps) * 100) : 0,
      },
      devices: { total: devices, online: devicesOnline },
      pendingAdjustments: pendingAdj,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/layout', async (req, res, next) => {
  try {
    res.json(await getDashboardLayout(req.auth!.sub));
  } catch (err) {
    next(err);
  }
});

router.put('/layout', async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const before = await getDashboardLayout(userId);
    const layout = DashboardLayoutSchema.parse(req.body);
    const saved = await saveDashboardLayout(userId, layout);
    const changedFields = dashboardLayoutChangedFields(before, saved);
    if (changedFields.length > 0) {
      await audit(
        'dashboard_layout_saved',
        {
          userId,
          ipAddress: req.clientIp ?? null,
          userAgent: req.header('user-agent') ?? null,
        },
        {
          entityType: 'user',
          entityId: userId,
          payload: dashboardLayoutAuditPayload(before, saved),
        }
      );
    }
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

router.get('/kpi', async (req, res, next) => {
  try {
    res.json(await getDashboardKpi(req.auth!.sub));
  } catch (err) {
    next(err);
  }
});

router.put('/kpi', async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const before = await getDashboardKpi(userId);
    const config = DashboardKpiConfigSchema.parse(req.body);
    const saved = await saveDashboardKpi(userId, config);
    if (dashboardKpiChanged(before, saved)) {
      await audit(
        'dashboard_kpi_saved',
        {
          userId,
          ipAddress: req.clientIp ?? null,
          userAgent: req.header('user-agent') ?? null,
        },
        {
          entityType: 'user',
          entityId: userId,
          payload: dashboardKpiAuditPayload(before, saved),
        }
      );
    }
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

router.get('/charts', async (req, res, next) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    res.json(await getDashboardCharts(date));
  } catch (err) {
    next(err);
  }
});

router.get('/attendance/departments', async (_req, res, next) => {
  try {
    const departments = await listDashboardDepartments();
    res.json({ departments });
  } catch (err) {
    next(err);
  }
});

router.get('/attendance', async (req, res, next) => {
  try {
    const q = DashboardAttendanceQuerySchema.parse(req.query);
    res.json(await listDashboardAttendance(q, req.auth!.viewMode));
  } catch (err) {
    next(err);
  }
});

router.get('/attendance.xlsx', async (req, res, next) => {
  try {
    const parsed = DashboardAttendanceQuerySchema.parse({ ...req.query, page: 1, pageSize: 50 });
    const { page: _p, pageSize: _ps, ...exportQuery } = parsed;
    const rows = await listDashboardAttendanceForExport(exportQuery, req.auth!.viewMode);

    const sheetRows = rows.map((r) => ({
      Employee: r.employeeName,
      ID: r.empCode,
      Department: r.department,
      Shift: shiftLabel(r.timeShift),
      'Entry stamp': r.entryStamp,
      'Exit stamp': r.exitStamp,
      'Total Hours Worked': r.totalHoursWorked ?? '',
      Status: r.displayStatus,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const settingsDoc = await SettingsModel.findOne().lean();
    const filename = buildExportFileName(
      'dashboardAttendanceXlsx',
      {
        department: parsed.department,
        asOfDate: parsed.date,
        companyName: settingsDoc?.companyName,
      },
      settingsDoc?.exportNaming,
      settingsDoc?.companyName
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.get('/week-trend', async (_req, res, next) => {
  try {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dates.push(utcToIstDateString(d));
    }
    const rows = await AttendanceDerivedModel.aggregate([
      { $match: { date: { $in: dates } } },
      {
        $group: {
          _id: { date: '$date', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]);
    const byDate: Record<string, { present: number; absent: number; weeklyOff: number }> = {};
    for (const d of dates) byDate[d] = { present: 0, absent: 0, weeklyOff: 0 };
    for (const r of rows) {
      const d = r._id.date as string;
      const s = r._id.status as string;
      if (!byDate[d]) continue;
      if (s === 'Present') byDate[d].present = r.count;
      if (s === 'Absent') byDate[d].absent = r.count;
      if (s === 'Weekly Off') byDate[d].weeklyOff = r.count;
    }
    res.json({ dates, series: byDate });
  } catch (err) {
    next(err);
  }
});

export default router;
