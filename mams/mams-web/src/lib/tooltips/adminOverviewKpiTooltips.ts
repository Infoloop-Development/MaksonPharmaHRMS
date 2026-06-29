import type { AdminOverviewKpiMetricId } from '@mams/types';

export const ADMIN_OVERVIEW_KPI_TOOLTIPS: Record<AdminOverviewKpiMetricId, string> = {
  active_users: 'Organization users with an active account. Click to open the users table.',
  org_admins: 'Users with organization admin role. Click to filter the users table.',
  inactive_users: 'Disabled or inactive user accounts. Click to filter the users table.',
  devices_online: 'Biometric devices reporting online now. Click to filter devices.',
  devices_offline: 'Devices not reachable on the last sync. Click to filter devices.',
  audit_events_7d: 'Security and admin audit events in the last 7 days. Click to open audit log.',
  failed_logins_7d: 'Failed sign-in attempts in the last 7 days. Click to open audit log.',
  api_status: 'API health from the latest system check.',
  total_active:
    'Active employees for today. Click to clear attendance filters on the overview table.',
  present: 'Present today. Click to filter attendance to present only.',
  absent: 'Absent today. Click to filter attendance to absent only.',
  late: 'Late arrivals today. Click to filter attendance to late only.',
  on_time: 'On-time arrivals today. Click to filter attendance to on-time only.',
  attendance_rate: 'Present divided by active employees today, as a percentage.',
  weekly_off: 'Weekly off today. Click to filter attendance to weekly off only.',
  half_day: 'Half-day attendance today. Click to filter attendance to half day only.',
  day_shift: 'Present on day shift today. Click to filter to day shift.',
  night_shift: 'Present on night shift today. Click to filter to night shift.',
  pending_adjustments:
    'Attendance adjustment requests awaiting action. Click to open related records.',
};

export function getAdminOverviewKpiTooltip(id: AdminOverviewKpiMetricId): string {
  return ADMIN_OVERVIEW_KPI_TOOLTIPS[id];
}
