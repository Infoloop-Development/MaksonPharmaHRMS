import type { AdminOverviewBarMetric, AdminOverviewDonutMetric, AdminOverviewKpiMetricId, AdminOverviewTableKind, Permission } from '@mams/types';
import { ALL_ADMIN_OVERVIEW_KPI_METRICS } from '@mams/types';
import { fmtNumber } from './format';

export type AdminBarMetric = AdminOverviewBarMetric;

export type AdminOverviewKpiFilterState = {
  activeMetric: AdminOverviewKpiMetricId | null;
  barMetric: AdminOverviewBarMetric;
  donutMetric: AdminOverviewDonutMetric;
};

export type AdminKpiValues = {
  governance: {
    activeUsers: number;
    orgAdmins: number;
    inactiveUsers: number;
    devicesOnline: number;
    devicesOffline: number;
    devicesTotal: number;
    auditEvents7d: number;
    failedLogins7d: number;
    apiOk: boolean;
    dbConnected: boolean;
  };
  hr: {
    employeesActive: number;
    employeesTotal: number;
    presentToday: number;
    absentToday: number;
    attendanceRate: number;
    pendingAdjustments: number;
    onTime: number;
    weeklyOff: number;
    halfDay: number;
    dayShiftPresent: number;
    nightShiftPresent: number;
    late: number;
    weekday: string;
  };
};

type Accent = 'primary' | 'green' | 'red' | 'amber';

const KPI_PERMISSIONS: Partial<Record<AdminOverviewKpiMetricId, Permission[]>> = {
  active_users: ['manage.org_users'],
  org_admins: ['manage.org_users'],
  inactive_users: ['manage.org_users'],
  audit_events_7d: ['read.org_audit'],
  failed_logins_7d: ['read.org_audit'],
  total_active: ['read.real', 'read.compliant'],
  present: ['read.real', 'read.compliant'],
  absent: ['read.real', 'read.compliant'],
  late: ['read.real', 'read.compliant'],
  on_time: ['read.real', 'read.compliant'],
  attendance_rate: ['read.real', 'read.compliant'],
  weekly_off: ['read.real', 'read.compliant'],
  half_day: ['read.real', 'read.compliant'],
  day_shift: ['read.real', 'read.compliant'],
  night_shift: ['read.real', 'read.compliant'],
  pending_adjustments: ['read.real', 'read.compliant'],
};

const TABLE_PERMISSIONS: Record<AdminOverviewTableKind, Permission[] | null> = {
  attendance: ['read.real', 'read.compliant'],
  users: ['manage.org_users'],
  audit: ['read.org_audit'],
  devices: null,
  employees: ['read.real', 'read.compliant', 'manage.employees'],
};

export function canAccessKpiMetric(metric: AdminOverviewKpiMetricId, permissions: Permission[]): boolean {
  const required = KPI_PERMISSIONS[metric];
  if (!required) return true;
  return required.some((p) => permissions.includes(p));
}

export function canAccessTableKind(kind: AdminOverviewTableKind, permissions: Permission[]): boolean {
  const required = TABLE_PERMISSIONS[kind];
  if (!required) return true;
  return required.some((p) => permissions.includes(p));
}

export function filterAllowedKpiMetrics(permissions: Permission[]): AdminOverviewKpiMetricId[] {
  return ALL_ADMIN_OVERVIEW_KPI_METRICS.filter((m) => canAccessKpiMetric(m, permissions));
}

export function filterAllowedTableKinds(permissions: Permission[]): AdminOverviewTableKind[] {
  return (['attendance', 'users', 'audit', 'devices', 'employees'] as const).filter((k) =>
    canAccessTableKind(k, permissions)
  );
}

const METRIC_LABELS: Record<AdminOverviewKpiMetricId, (v: AdminKpiValues) => string> = {
  active_users: () => 'Active users',
  org_admins: () => 'Org admins',
  inactive_users: () => 'Inactive users',
  devices_online: () => 'Devices online',
  devices_offline: () => 'Devices offline',
  audit_events_7d: () => 'Audit events (7d)',
  failed_logins_7d: () => 'Failed logins (7d)',
  api_status: () => 'API status',
  total_active: (v) => (v.hr.weekday ? `Active employees ${v.hr.weekday}` : 'Active employees'),
  present: (v) => (v.hr.weekday ? `Present ${v.hr.weekday}` : 'Present today'),
  absent: (v) => (v.hr.weekday ? `Absent ${v.hr.weekday}` : 'Absent today'),
  late: () => 'Late arrivals',
  on_time: () => 'On time',
  attendance_rate: () => 'Attendance %',
  weekly_off: () => 'Weekly off',
  half_day: () => 'Half day',
  day_shift: () => 'Day shift',
  night_shift: () => 'Night shift',
  pending_adjustments: () => 'Pending adjustments',
};

const METRIC_ACCENTS: Record<AdminOverviewKpiMetricId, Accent> = {
  active_users: 'primary',
  org_admins: 'primary',
  inactive_users: 'red',
  devices_online: 'green',
  devices_offline: 'red',
  audit_events_7d: 'amber',
  failed_logins_7d: 'red',
  api_status: 'green',
  total_active: 'primary',
  present: 'green',
  absent: 'red',
  late: 'amber',
  on_time: 'green',
  attendance_rate: 'primary',
  weekly_off: 'red',
  half_day: 'amber',
  day_shift: 'primary',
  night_shift: 'primary',
  pending_adjustments: 'amber',
};

export function getAdminMetricLabel(id: AdminOverviewKpiMetricId, values: AdminKpiValues): string {
  return METRIC_LABELS[id](values);
}

export function getAdminMetricAccent(id: AdminOverviewKpiMetricId): Accent {
  return METRIC_ACCENTS[id];
}

export function getAdminMetricValue(id: AdminOverviewKpiMetricId, v: AdminKpiValues): string {
  switch (id) {
    case 'active_users':
      return fmtNumber(v.governance.activeUsers);
    case 'org_admins':
      return fmtNumber(v.governance.orgAdmins);
    case 'inactive_users':
      return fmtNumber(v.governance.inactiveUsers);
    case 'devices_online':
      return fmtNumber(v.governance.devicesOnline);
    case 'devices_offline':
      return fmtNumber(v.governance.devicesOffline);
    case 'audit_events_7d':
      return fmtNumber(v.governance.auditEvents7d);
    case 'failed_logins_7d':
      return fmtNumber(v.governance.failedLogins7d);
    case 'api_status':
      return v.governance.apiOk && v.governance.dbConnected ? 'Online' : 'Degraded';
    case 'total_active':
      return fmtNumber(v.hr.employeesActive);
    case 'present':
      return fmtNumber(v.hr.presentToday);
    case 'absent':
      return fmtNumber(v.hr.absentToday);
    case 'late':
      return fmtNumber(v.hr.late);
    case 'on_time':
      return fmtNumber(v.hr.onTime);
    case 'attendance_rate':
      return `${v.hr.attendanceRate}%`;
    case 'weekly_off':
      return fmtNumber(v.hr.weeklyOff);
    case 'half_day':
      return fmtNumber(v.hr.halfDay);
    case 'day_shift':
      return fmtNumber(v.hr.dayShiftPresent);
    case 'night_shift':
      return fmtNumber(v.hr.nightShiftPresent);
    case 'pending_adjustments':
      return fmtNumber(v.hr.pendingAdjustments);
    default:
      return '—';
  }
}

export function getAdminMetricSub(id: AdminOverviewKpiMetricId, v: AdminKpiValues): string {
  switch (id) {
    case 'active_users':
      return 'across all roles';
    case 'org_admins':
      return 'must keep ≥ 1 active';
    case 'inactive_users':
      return 'disabled accounts';
    case 'devices_online':
      return `${fmtNumber(v.governance.devicesTotal)} total devices`;
    case 'devices_offline':
      return 'not responding';
    case 'audit_events_7d':
      return 'platform activity';
    case 'failed_logins_7d':
      return 'security signal';
    case 'api_status':
      return v.governance.dbConnected ? 'DB connected' : 'DB offline';
    case 'total_active':
      return `${fmtNumber(v.hr.employeesTotal)} total employees`;
    case 'present':
      return `${v.hr.attendanceRate}% attendance`;
    case 'absent':
      return 'not present today';
    case 'late':
      return 'after shift start';
    case 'on_time':
      return 'punctual arrivals';
    case 'attendance_rate':
      return `${fmtNumber(v.hr.presentToday)} present`;
    case 'pending_adjustments':
      return 'awaiting approval';
    default:
      return '';
  }
}

export function getAdminMetricPickerLabel(id: AdminOverviewKpiMetricId): string {
  return METRIC_LABELS[id]({
    governance: {
      activeUsers: 0,
      orgAdmins: 0,
      inactiveUsers: 0,
      devicesOnline: 0,
      devicesOffline: 0,
      devicesTotal: 0,
      auditEvents7d: 0,
      failedLogins7d: 0,
      apiOk: true,
      dbConnected: true,
    },
    hr: {
      employeesActive: 0,
      employeesTotal: 0,
      presentToday: 0,
      absentToday: 0,
      attendanceRate: 0,
      pendingAdjustments: 0,
      onTime: 0,
      weeklyOff: 0,
      halfDay: 0,
      dayShiftPresent: 0,
      nightShiftPresent: 0,
      late: 0,
      weekday: '',
    },
  });
}

export function kpiMetricToBarMetric(metric: AdminOverviewKpiMetricId | null): AdminOverviewBarMetric {
  const map: Partial<Record<AdminOverviewKpiMetricId, AdminOverviewBarMetric>> = {
    active_users: 'users_active',
    org_admins: 'users_active',
    inactive_users: 'users_active',
    devices_online: 'devices_online',
    devices_offline: 'devices_online',
    audit_events_7d: 'audit_events',
    failed_logins_7d: 'login_failed',
    total_active: 'employees_active',
    present: 'present',
    absent: 'absent',
    late: 'late',
    on_time: 'present',
    attendance_rate: 'present',
    weekly_off: 'absent',
    half_day: 'absent',
    day_shift: 'present',
    night_shift: 'present',
    pending_adjustments: 'employees_active',
  };
  if (!metric) return 'present';
  return map[metric] ?? 'present';
}

export function applyAdminMetricClick(
  metric: AdminOverviewKpiMetricId,
  current: AdminOverviewKpiFilterState
): AdminOverviewKpiFilterState {
  const togglingOff = current.activeMetric === metric;
  const barMetric = togglingOff ? 'present' : kpiMetricToBarMetric(metric);
  return {
    activeMetric: togglingOff ? null : metric,
    barMetric,
    donutMetric: current.donutMetric,
  };
}

export function isAdminMetricSelected(
  metric: AdminOverviewKpiMetricId,
  state: AdminOverviewKpiFilterState
): boolean {
  return state.activeMetric === metric;
}

export const BAR_METRIC_LABELS: Record<AdminOverviewBarMetric, string> = {
  employees_total: 'Employees (total)',
  employees_active: 'Active employees',
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  users_active: 'Active users (logins)',
  audit_events: 'Audit events',
  login_success: 'Successful logins',
  login_failed: 'Failed logins',
  devices_online: 'Devices online',
};

export const DONUT_METRIC_LABELS: Record<AdminOverviewDonutMetric, string> = {
  attendance_punctuality: 'Attendance punctuality',
  users_by_role: 'Users by role',
  devices_status: 'Device status',
};

export { ALL_ADMIN_OVERVIEW_KPI_METRICS };
