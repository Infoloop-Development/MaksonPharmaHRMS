import type { DashboardKpiMetricId } from '@mams/types';

export const DASHBOARD_KPI_TOOLTIPS: Record<DashboardKpiMetricId, string> = {
  total_active:
    'Count of active employees in scope for the selected date. Click to clear attendance filters.',
  present:
    'Employees marked present for the selected date. Click to filter the table and chart to present only.',
  absent:
    'Employees marked absent for the selected date. Click to filter the table and chart to absent only.',
  late:
    'Arrivals after the allowed grace period for the selected date. Click to filter to late only.',
  on_time:
    'Punctual arrivals within the grace window. Click to filter to on-time only.',
  attendance_rate:
    'Present employees divided by total active, as a percentage for the selected date.',
  weekly_off:
    'Scheduled weekly off for the selected date. Click to filter to weekly off only.',
  half_day:
    'Partial attendance (half day) for the selected date. Click to filter to half day only.',
  day_shift:
    'Present employees on the day shift. Click to filter the table to day shift.',
  night_shift:
    'Present employees on the night shift. Click to filter the table to night shift.',
};

export function getDashboardKpiTooltip(id: DashboardKpiMetricId): string {
  return DASHBOARD_KPI_TOOLTIPS[id];
}
