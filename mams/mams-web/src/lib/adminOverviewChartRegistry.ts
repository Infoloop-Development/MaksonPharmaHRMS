import type {
  AdminChartMetricId,
  AdminChartType,
  AdminOverviewAnalyticsPayload,
  AdminOverviewWidget,
  Permission,
} from '@mams/types';
import { METRICS_BY_CHART_TYPE } from '@mams/types';

export type MetricCategory = 'HR' | 'Governance' | 'Security' | 'Devices';

export type MetricMeta = {
  id: AdminChartMetricId;
  label: string;
  category: MetricCategory;
  permissions: Permission[] | null;
  description: string;
};

export const METRIC_META: Record<AdminChartMetricId, MetricMeta> = {
  present: { id: 'present', label: 'Present', category: 'HR', permissions: ['read.real', 'read.compliant'], description: 'Employees marked present' },
  absent: { id: 'absent', label: 'Absent', category: 'HR', permissions: ['read.real', 'read.compliant'], description: 'Employees marked absent' },
  late: { id: 'late', label: 'Late arrivals', category: 'HR', permissions: ['read.real', 'read.compliant'], description: 'Late punch-ins' },
  attendance_rate: { id: 'attendance_rate', label: 'Attendance rate %', category: 'HR', permissions: ['read.real', 'read.compliant'], description: 'Present / active %' },
  employees_active: { id: 'employees_active', label: 'Active employees', category: 'HR', permissions: ['read.real', 'read.compliant'], description: 'Active headcount' },
  employees_total: { id: 'employees_total', label: 'Total employees', category: 'HR', permissions: ['read.real', 'read.compliant'], description: 'All employees' },
  users_active: { id: 'users_active', label: 'Active users (logins)', category: 'Governance', permissions: ['manage.org_users'], description: 'Distinct users logged in' },
  audit_events: { id: 'audit_events', label: 'Audit events', category: 'Governance', permissions: ['read.org_audit'], description: 'Platform audit volume' },
  login_success: { id: 'login_success', label: 'Successful logins', category: 'Security', permissions: ['read.org_audit'], description: 'Login success count' },
  login_failed: { id: 'login_failed', label: 'Failed logins', category: 'Security', permissions: ['read.org_audit'], description: 'Login failure count' },
  devices_online: { id: 'devices_online', label: 'Devices online', category: 'Devices', permissions: null, description: 'Devices responding' },
  attendance_status: { id: 'attendance_status', label: 'Present / absent / late', category: 'HR', permissions: ['read.real', 'read.compliant'], description: 'Multi-series attendance' },
  login_outcomes: { id: 'login_outcomes', label: 'Login success vs failed', category: 'Security', permissions: ['read.org_audit'], description: 'Auth outcomes' },
  shift_present: { id: 'shift_present', label: 'Day vs night present', category: 'HR', permissions: ['read.real', 'read.compliant'], description: 'Shift split' },
  attendance_punctuality: { id: 'attendance_punctuality', label: 'Punctuality', category: 'HR', permissions: ['read.real', 'read.compliant'], description: 'On time / late / leave' },
  users_by_role: { id: 'users_by_role', label: 'Users by role', category: 'Governance', permissions: ['manage.org_users'], description: 'Active users per role' },
  devices_status: { id: 'devices_status', label: 'Device status', category: 'Devices', permissions: null, description: 'Online vs offline' },
  attendance_by_status: { id: 'attendance_by_status', label: 'Status breakdown', category: 'HR', permissions: ['read.real', 'read.compliant'], description: 'Present, absent, off, half day' },
  audit_by_module: { id: 'audit_by_module', label: 'Audit by module', category: 'Governance', permissions: ['read.org_audit'], description: 'Events grouped by area' },
  top_departments_present: { id: 'top_departments_present', label: 'Top departments (present)', category: 'HR', permissions: ['read.real', 'read.compliant'], description: 'Top 5 departments' },
  audit_event_types: { id: 'audit_event_types', label: 'Top audit events', category: 'Governance', permissions: ['read.org_audit'], description: 'Most frequent events' },
  devices_by_location: { id: 'devices_by_location', label: 'Devices by location', category: 'Devices', permissions: null, description: 'Device distribution' },
  employees_by_status: { id: 'employees_by_status', label: 'Employees by status', category: 'HR', permissions: ['read.real', 'read.compliant', 'manage.employees'], description: 'Active / inactive split' },
};

export const CHART_TYPE_META: Record<
  AdminChartType,
  { label: string; description: string; icon: string }
> = {
  line: { label: 'Line', description: '7-day trend lines', icon: '📈' },
  area: { label: 'Area', description: 'Volume over time', icon: '📊' },
  bar: { label: 'Column bar', description: 'Daily column comparison', icon: '📶' },
  stacked_bar: { label: 'Stacked bar', description: 'Multi-series daily comparison', icon: '📚' },
  pie: { label: 'Pie', description: 'Full-circle breakdown', icon: '🥧' },
  donut: { label: 'Donut', description: 'Ring breakdown with center', icon: '🍩' },
  horizontal_bar: { label: 'Horizontal bar', description: 'Rankings & composition', icon: '📋' },
};

export const ALL_CHART_TYPES: AdminChartType[] = [
  'line',
  'area',
  'bar',
  'stacked_bar',
  'pie',
  'donut',
  'horizontal_bar',
];

export function canAccessMetric(metricId: AdminChartMetricId, permissions: Permission[]): boolean {
  const meta = METRIC_META[metricId];
  if (!meta.permissions) return true;
  return meta.permissions.some((p) => permissions.includes(p));
}

export function getMetricsForChartType(
  chartType: AdminChartType,
  permissions: Permission[]
): AdminChartMetricId[] {
  return METRICS_BY_CHART_TYPE[chartType].filter((m) => canAccessMetric(m, permissions));
}

export function getDefaultMetricForChartType(
  chartType: AdminChartType,
  permissions: Permission[]
): AdminChartMetricId {
  const allowed = getMetricsForChartType(chartType, permissions);
  return allowed[0] ?? METRICS_BY_CHART_TYPE[chartType][0]!;
}

export function getMetricLabel(metricId: AdminChartMetricId): string {
  return METRIC_META[metricId]?.label ?? metricId;
}

export function getChartTypeLabel(chartType: AdminChartType): string {
  return CHART_TYPE_META[chartType].label;
}

export function getTrendSeries(
  analytics: AdminOverviewAnalyticsPayload,
  metricId: AdminChartMetricId
): number[] {
  const d = analytics.last7Days;
  const map: Partial<Record<AdminChartMetricId, number[]>> = {
    present: d.present,
    absent: d.absent,
    late: d.late,
    attendance_rate: d.attendance_rate,
    employees_active: d.employees_active,
    employees_total: d.employees_total,
    users_active: d.users_active,
    audit_events: d.audit_events,
    login_success: d.login_success,
    login_failed: d.login_failed,
    devices_online: d.devices_online,
  };
  return map[metricId] ?? [];
}

export function widgetTitle(widget: AdminOverviewWidget): string {
  return `${CHART_TYPE_META[widget.chartType].label} · ${getMetricLabel(widget.metricId)}`;
}

export const METRIC_CATEGORIES: MetricCategory[] = ['HR', 'Governance', 'Security', 'Devices'];

export function metricsByCategory(
  chartType: AdminChartType,
  permissions: Permission[]
): Record<MetricCategory, AdminChartMetricId[]> {
  const allowed = getMetricsForChartType(chartType, permissions);
  const out: Record<MetricCategory, AdminChartMetricId[]> = {
    HR: [],
    Governance: [],
    Security: [],
    Devices: [],
  };
  for (const id of allowed) {
    out[METRIC_META[id].category].push(id);
  }
  return out;
}
