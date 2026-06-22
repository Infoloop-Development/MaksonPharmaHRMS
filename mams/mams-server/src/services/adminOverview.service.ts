import type {
  AdminOverviewAnalyticsPayload,
  AdminOverviewBarMetric,
  AdminOverviewChartsPayload,
  AdminOverviewChartsQuery,
  AdminOverviewDonutMetric,
  AdminOverviewStats,
} from '@mams/types';
import { AdminOverviewAnalyticsPayloadSchema, AdminOverviewChartsPayloadSchema } from '@mams/types';
import mongooseLib from 'mongoose';
import { UserModel } from '../models/User.js';
import { DeviceModel } from '../models/Device.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { EmployeeModel } from '../models/Employee.js';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { AdjustmentModel } from '../models/Adjustment.js';
import { getDashboardCharts } from './dashboard.service.js';
import { utcToIstDateString } from '../utils/time.js';

const DEVICE_ONLINE_MS = 15 * 60 * 1000;
const IST_TZ = 'Asia/Kolkata';

function lastNIstDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    dates.push(utcToIstDateString(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  }
  return dates;
}

function istDayRange(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00+05:30`);
  const end = new Date(`${date}T23:59:59.999+05:30`);
  return { start, end };
}

async function countAuditByEventTypes(
  dates: string[],
  eventTypes: string[]
): Promise<number[]> {
  const min = istDayRange(dates[0]!).start;
  const max = istDayRange(dates[dates.length - 1]!).end;
  const rows = await AuditLogModel.aggregate([
    {
      $match: {
        occurredAt: { $gte: min, $lte: max },
        eventType: { $in: eventTypes },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$occurredAt', timezone: IST_TZ },
        },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDate = new Map(rows.map((r) => [r._id as string, r.count as number]));
  return dates.map((d) => byDate.get(d) ?? 0);
}

async function countAuditEventsPerDay(dates: string[]): Promise<number[]> {
  const min = istDayRange(dates[0]!).start;
  const max = istDayRange(dates[dates.length - 1]!).end;
  const rows = await AuditLogModel.aggregate([
    { $match: { occurredAt: { $gte: min, $lte: max } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$occurredAt', timezone: IST_TZ },
        },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDate = new Map(rows.map((r) => [r._id as string, r.count as number]));
  return dates.map((d) => byDate.get(d) ?? 0);
}

async function countActiveLoginsPerDay(dates: string[]): Promise<number[]> {
  const min = istDayRange(dates[0]!).start;
  const max = istDayRange(dates[dates.length - 1]!).end;
  const rows = await AuditLogModel.aggregate([
    {
      $match: {
        occurredAt: { $gte: min, $lte: max },
        eventType: 'login',
        userId: { $ne: null },
      },
    },
    {
      $group: {
        _id: {
          day: {
            $dateToString: { format: '%Y-%m-%d', date: '$occurredAt', timezone: IST_TZ },
          },
          userId: '$userId',
        },
      },
    },
    {
      $group: {
        _id: '$_id.day',
        count: { $sum: 1 },
      },
    },
  ]);
  const byDate = new Map(rows.map((r) => [r._id as string, r.count as number]));
  return dates.map((d) => byDate.get(d) ?? 0);
}

async function countDevicesOnlinePerDay(dates: string[]): Promise<number[]> {
  const results: number[] = [];
  for (const date of dates) {
    const { end } = istDayRange(date);
    const threshold = new Date(end.getTime() - DEVICE_ONLINE_MS);
    const count = await DeviceModel.countDocuments({
      isActive: true,
      lastPingAt: { $gte: threshold, $lte: end },
    });
    results.push(count);
  }
  return results;
}

async function getUsersByRole() {
  const rows = await UserModel.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);
  const byRole = new Map(rows.map((r) => [r._id as string, r.count as number]));
  return {
    'org.admin': byRole.get('org.admin') ?? 0,
    'hr.admin': byRole.get('hr.admin') ?? 0,
    'hr.compliance': byRole.get('hr.compliance') ?? 0,
    'it.admin': byRole.get('it.admin') ?? 0,
  };
}

async function getDevicesStatus() {
  const total = await DeviceModel.countDocuments({ isActive: true });
  const online = await DeviceModel.countDocuments({
    isActive: true,
    lastPingAt: { $gte: new Date(Date.now() - DEVICE_ONLINE_MS) },
  });
  return { online, offline: total - online };
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const today = utcToIstDateString(new Date());
  const weekStart = utcToIstDateString(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  const weekStartDate = istDayRange(weekStart).start;

  const dbConnected = mongooseLib.connection.readyState === 1;

  const [
    activeUsers,
    orgAdmins,
    inactiveUsers,
    devicesTotal,
    devicesOnline,
    auditEvents7d,
    failedLogins7d,
    employeesActive,
    employeesTotal,
    presentToday,
    absentToday,
    pendingAdjustments,
  ] = await Promise.all([
    UserModel.countDocuments({ isActive: true }),
    UserModel.countDocuments({ isActive: true, role: 'org.admin' }),
    UserModel.countDocuments({ isActive: false }),
    DeviceModel.countDocuments({ isActive: true }),
    DeviceModel.countDocuments({
      isActive: true,
      lastPingAt: { $gte: new Date(Date.now() - DEVICE_ONLINE_MS) },
    }),
    AuditLogModel.countDocuments({ occurredAt: { $gte: weekStartDate } }),
    AuditLogModel.countDocuments({
      occurredAt: { $gte: weekStartDate },
      eventType: 'login_failed',
    }),
    EmployeeModel.countDocuments({ status: 'Active', isDeleted: { $ne: true } }),
    EmployeeModel.countDocuments({ isDeleted: { $ne: true } }),
    AttendanceDerivedModel.countDocuments({ date: today, status: 'Present' }),
    AttendanceDerivedModel.countDocuments({ date: today, status: 'Absent' }),
    AdjustmentModel.countDocuments({ status: 'Pending' }),
  ]);

  return {
    asOfDate: today,
    governance: {
      activeUsers,
      orgAdmins,
      inactiveUsers,
      devicesOnline,
      devicesOffline: devicesTotal - devicesOnline,
      devicesTotal,
      auditEvents7d,
      failedLogins7d,
      apiOk: true,
      dbConnected,
    },
    hr: {
      employeesActive,
      employeesTotal,
      presentToday,
      absentToday,
      attendanceRate:
        employeesActive > 0 ? Math.round((presentToday / employeesActive) * 100) : 0,
      pendingAdjustments,
    },
  };
}

export async function getAdminOverviewCharts(
  query: AdminOverviewChartsQuery
): Promise<AdminOverviewChartsPayload> {
  const barMetric: AdminOverviewBarMetric = query.barMetric ?? 'present';
  const donutMetric: AdminOverviewDonutMetric = query.donutMetric ?? 'attendance_punctuality';

  const dashboard = await getDashboardCharts(query.date);
  const dates = dashboard.last7Days.dates;

  const [
    auditEvents,
    loginSuccess,
    loginFailed,
    usersActive,
    devicesOnline,
    usersByRole,
    devicesStatus,
  ] = await Promise.all([
    countAuditEventsPerDay(dates),
    countAuditByEventTypes(dates, ['login']),
    countAuditByEventTypes(dates, ['login_failed']),
    countActiveLoginsPerDay(dates),
    countDevicesOnlinePerDay(dates),
    getUsersByRole(),
    getDevicesStatus(),
  ]);

  const employeesTotal = dashboard.last7Days.totalEmployees;
  const employeesActive = employeesTotal;

  const payload: AdminOverviewChartsPayload = {
    asOfDate: dashboard.asOfDate,
    weekRange: dashboard.weekRange,
    barMetric,
    donutMetric,
    last7Days: {
      dates,
      employees_total: dates.map(() => employeesTotal),
      employees_active: dates.map(() => employeesActive),
      present: dashboard.last7Days.present,
      absent: dashboard.last7Days.absent,
      late: dashboard.last7Days.late,
      users_active: usersActive,
      audit_events: auditEvents,
      login_success: loginSuccess,
      login_failed: loginFailed,
      devices_online: devicesOnline,
      weeklyOff: dashboard.last7Days.weeklyOff,
      halfDay: dashboard.last7Days.halfDay,
      dayShiftPresent: dashboard.last7Days.dayShiftPresent,
      nightShiftPresent: dashboard.last7Days.nightShiftPresent,
      totalEmployees: employeesTotal,
    },
    weekPunctuality: dashboard.weekPunctuality,
    usersByRole,
    devicesStatus,
  };

  return AdminOverviewChartsPayloadSchema.parse(payload);
}

function auditModuleFromEventType(eventType: string): string {
  const badge = auditPageBadge(eventType);
  return badge;
}

async function getAuditByModuleForDay(date: string) {
  const { start, end } = istDayRange(date);
  const rows = await AuditLogModel.aggregate([
    { $match: { occurredAt: { $gte: start, $lte: end } } },
    { $group: { _id: '$eventType', count: { $sum: 1 } } },
  ]);
  const byModule = new Map<string, number>();
  for (const r of rows) {
    const mod = auditModuleFromEventType(r._id as string);
    byModule.set(mod, (byModule.get(mod) ?? 0) + (r.count as number));
  }
  return [...byModule.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

async function getAuditEventTypesForDay(date: string) {
  const { start, end } = istDayRange(date);
  const rows = await AuditLogModel.aggregate([
    { $match: { occurredAt: { $gte: start, $lte: end } } },
    { $group: { _id: '$eventType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);
  return rows.map((r) => ({
    label: (r._id as string).replace(/_/g, ' '),
    value: r.count as number,
  }));
}

async function getTopDepartmentsPresent(date: string) {
  const rows = await AttendanceDerivedModel.aggregate([
    { $match: { date, status: 'Present' } },
    {
      $lookup: {
        from: 'employees',
        localField: 'employeeId',
        foreignField: '_id',
        as: 'emp',
      },
    },
    { $unwind: '$emp' },
    { $group: { _id: '$emp.department', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);
  return rows.map((r) => ({ label: (r._id as string) || 'Unknown', value: r.count as number }));
}

async function getDevicesByLocation() {
  const rows = await DeviceModel.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$location', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);
  return rows.map((r) => ({ label: (r._id as string) || 'Unknown', value: r.count as number }));
}

async function getEmployeesByStatus() {
  const rows = await EmployeeModel.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((r) => ({ label: (r._id as string) || 'Unknown', value: r.count as number }));
}

async function getAttendanceByStatusForDay(date: string) {
  const [present, absent, weeklyOff, halfDay, lateCount] = await Promise.all([
    AttendanceDerivedModel.countDocuments({ date, status: 'Present' }),
    AttendanceDerivedModel.countDocuments({ date, status: 'Absent' }),
    AttendanceDerivedModel.countDocuments({ date, status: 'Weekly Off' }),
    AttendanceDerivedModel.countDocuments({ date, status: 'Half Day' }),
    AttendanceDerivedModel.aggregate([
      { $match: { date, status: 'Present' } },
      {
        $lookup: {
          from: 'employees',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'emp',
        },
      },
      { $unwind: '$emp' },
      { $project: { realEntryAt: 1, timeShift: '$emp.timeShift' } },
    ]).then(async (presentRows) => {
      const { isLateEntry } = await import('./dashboard.service.js');
      let late = 0;
      for (const row of presentRows) {
        const entry = row.realEntryAt as Date | null;
        const shift = row.timeShift as 'Day' | 'Night';
        if (entry && isLateEntry(entry, shift)) late += 1;
      }
      return late;
    }),
  ]);
  return { present, absent, weeklyOff, halfDay, late: lateCount };
}

export async function getAdminOverviewAnalytics(date?: string): Promise<AdminOverviewAnalyticsPayload> {
  const dashboard = await getDashboardCharts(date);
  const dates = dashboard.last7Days.dates;
  const selectedDate =
    date && dates.includes(date) ? date : dates[dates.length - 1]!;

  const [
    auditEvents,
    loginSuccess,
    loginFailed,
    usersActive,
    devicesOnline,
    usersByRole,
    devicesStatus,
    auditByModule,
    auditEventTypes,
    topDepartmentsPresent,
    devicesByLocation,
    employeesByStatus,
    attendanceByStatus,
  ] = await Promise.all([
    countAuditEventsPerDay(dates),
    countAuditByEventTypes(dates, ['login']),
    countAuditByEventTypes(dates, ['login_failed']),
    countActiveLoginsPerDay(dates),
    countDevicesOnlinePerDay(dates),
    getUsersByRole(),
    getDevicesStatus(),
    getAuditByModuleForDay(selectedDate),
    getAuditEventTypesForDay(selectedDate),
    getTopDepartmentsPresent(selectedDate),
    getDevicesByLocation(),
    getEmployeesByStatus(),
    getAttendanceByStatusForDay(selectedDate),
  ]);

  const employeesTotal = dashboard.last7Days.totalEmployees;
  const employeesActive = employeesTotal;
  const attendanceRate = dates.map((d, i) => {
    const p = dashboard.last7Days.present[i] ?? 0;
    return employeesActive > 0 ? Math.round((p / employeesActive) * 100) : 0;
  });

  const payload: AdminOverviewAnalyticsPayload = {
    asOfDate: dashboard.asOfDate,
    weekRange: dashboard.weekRange,
    selectedDate,
    last7Days: {
      dates,
      totalEmployees: employeesTotal,
      present: dashboard.last7Days.present,
      absent: dashboard.last7Days.absent,
      late: dashboard.last7Days.late,
      attendance_rate: attendanceRate,
      employees_active: dates.map(() => employeesActive),
      employees_total: dates.map(() => employeesTotal),
      users_active: usersActive,
      audit_events: auditEvents,
      login_success: loginSuccess,
      login_failed: loginFailed,
      devices_online: devicesOnline,
      weeklyOff: dashboard.last7Days.weeklyOff,
      halfDay: dashboard.last7Days.halfDay,
      dayShiftPresent: dashboard.last7Days.dayShiftPresent,
      nightShiftPresent: dashboard.last7Days.nightShiftPresent,
    },
    weekPunctuality: dashboard.weekPunctuality,
    breakdowns: {
      usersByRole,
      devicesStatus,
      attendanceByStatus,
      auditByModule,
      auditEventTypes,
      topDepartmentsPresent,
      devicesByLocation,
      employeesByStatus,
    },
  };

  return AdminOverviewAnalyticsPayloadSchema.parse(payload);
}

export async function listAdminOverviewUsers(q: {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  active?: boolean;
}) {
  const filter: Record<string, unknown> = {};
  if (q.search?.trim()) {
    const re = new RegExp(q.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  if (q.role) filter.role = q.role;
  if (q.active !== undefined) filter.isActive = q.active;
  const [total, rows] = await Promise.all([
    UserModel.countDocuments(filter),
    UserModel.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: 1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
  ]);
  const items = rows.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.isActive,
    lastLogin: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    permissionsCount: Array.isArray(u.permissions) ? u.permissions.length : 0,
  }));
  return { items, total, page: q.page, pageSize: q.pageSize };
}

export async function listAdminOverviewDevices(q: {
  page: number;
  pageSize: number;
  search?: string;
  online?: boolean;
  location?: string;
}) {
  const filter: Record<string, unknown> = {};
  if (q.search?.trim()) {
    const re = new RegExp(q.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { deviceCode: re }, { location: re }];
  }
  if (q.location?.trim()) {
    filter.location = new RegExp(q.location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  const onlineThreshold = new Date(Date.now() - 5 * 60 * 1000);
  if (q.online === true) {
    filter.lastPingAt = { $gte: onlineThreshold };
  } else if (q.online === false) {
    filter.$and = [
      ...((filter.$and as unknown[]) ?? []),
      {
        $or: [
          { lastPingAt: { $lt: onlineThreshold } },
          { lastPingAt: { $exists: false } },
          { lastPingAt: null },
        ],
      },
    ];
  }
  const [total, rows] = await Promise.all([
    DeviceModel.countDocuments(filter),
    DeviceModel.find(filter)
      .sort({ deviceCode: 1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
  ]);
  const now = Date.now();
  const items = rows.map((d) => ({
    id: String(d._id),
    name: d.name,
    deviceCode: d.deviceCode,
    location: d.location,
    department: d.department ?? null,
    vendor: d.vendor ?? 'eSSL',
    online: Boolean(d.lastPingAt && d.lastPingAt > new Date(now - 5 * 60 * 1000)),
    lastPing: d.lastPingAt ? d.lastPingAt.toISOString() : null,
  }));
  return { items, total, page: q.page, pageSize: q.pageSize };
}

export async function listAdminOverviewEmployees(q: {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  department?: string;
}) {
  const filter: Record<string, unknown> = { isDeleted: { $ne: true } };
  if (q.search?.trim()) {
    const re = new RegExp(q.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { empCode: re }, { department: re }];
  }
  if (q.status?.trim()) filter.status = q.status;
  if (q.department?.trim()) {
    filter.department = new RegExp(q.department.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  const [total, rows] = await Promise.all([
    EmployeeModel.countDocuments(filter),
    EmployeeModel.find(filter)
      .sort({ empCode: 1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
  ]);
  const items = rows.map((e) => ({
    id: String(e._id),
    name: e.name,
    empCode: e.empCode,
    department: e.department,
    status: e.status,
    shift: e.timeShift,
    location: e.location ?? null,
    biometricId: e.biometricId ?? null,
  }));
  return { items, total, page: q.page, pageSize: q.pageSize };
}

export function auditPageBadge(eventType: string): string {
  if (
    eventType.startsWith('ui.employees') ||
    eventType === 'employee_created' ||
    eventType === 'csv_import'
  ) {
    return 'Employees';
  }
  if (eventType.startsWith('ui.attendance')) return 'Attendance';
  if (eventType.startsWith('ui.reports')) return 'Reports';
  if (eventType.startsWith('ui.devices') || eventType.startsWith('device_')) return 'Devices';
  if (eventType === 'settings_changed' || eventType.startsWith('user_')) return 'Settings';
  if (
    eventType.startsWith('ui.dashboard') ||
    eventType === 'dashboard_layout_saved' ||
    eventType === 'dashboard_kpi_saved'
  ) {
    return 'Dashboard';
  }
  if (
    eventType.startsWith('admin_overview') ||
    eventType.startsWith('ui.admin')
  ) {
    return 'Admin';
  }
  if (eventType.startsWith('leave_') || eventType === 'holiday_created') return 'Leave';
  if (eventType.startsWith('regularization_')) return 'Regularization';
  if (['login', 'logout', 'password_changed', 'login_failed'].includes(eventType)) return 'Auth';
  if (eventType === 'feature_flags_changed') return 'Feature flags';
  return 'System';
}
