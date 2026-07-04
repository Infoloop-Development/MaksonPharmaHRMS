import type {
  DashboardAttendanceStatusFilter,
  DashboardKpiMetricId,
} from '@mams/types';
import { ALL_DASHBOARD_KPI_METRICS } from '@mams/types';
import { fmtNumber } from './format';
import { getDashboardKpiTooltip } from './tooltips/dashboardKpiTooltips';

export type DashboardShiftFilter = 'All' | 'Day' | 'Night';
export type BarMetric = 'present' | 'absent' | 'late';

export type DashboardKpiFilterState = {
  statusFilter: DashboardAttendanceStatusFilter;
  shiftFilter: DashboardShiftFilter;
  activeMetric: DashboardKpiMetricId | null;
};

export type KpiDayValues = {
  total: number;
  present: number;
  absent: number;
  late: number;
  onTime: number;
  weeklyOff: number;
  halfDay: number;
  dayShiftPresent: number;
  nightShiftPresent: number;
  weekday: string;
  isToday?: boolean;
};

type Accent = 'primary' | 'green' | 'red' | 'amber';

const METRIC_LABELS: Record<DashboardKpiMetricId, (v: KpiDayValues) => string> = {
  total_active: () => 'Total Active',
  present: (v) => (v.isToday || !v.weekday || v.weekday === '-' ? 'Present Today' : `Present ${v.weekday}`),
  absent: (v) => (v.isToday || !v.weekday || v.weekday === '-' ? 'Absent Today' : `Absent ${v.weekday}`),
  late: () => 'Late Arrivals',
  on_time: () => 'On Time',
  attendance_rate: () => 'Attendance %',
  weekly_off: () => 'Weekly Off',
  half_day: () => 'Half Day',
  day_shift: () => 'Day Shift',
  night_shift: () => 'Night Shift',
};

const METRIC_ACCENTS: Record<DashboardKpiMetricId, Accent> = {
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
};

export function getMetricLabel(id: DashboardKpiMetricId, values: KpiDayValues, isCompliant = false): string {
  if (isCompliant && id === 'day_shift') return 'Shift A';
  if (isCompliant && id === 'night_shift') return 'Shift B+C';
  return METRIC_LABELS[id](values);
}

export function getMetricAccent(id: DashboardKpiMetricId): Accent {
  return METRIC_ACCENTS[id];
}

export function getMetricValue(id: DashboardKpiMetricId, v: KpiDayValues): string {
  switch (id) {
    case 'total_active':
      return fmtNumber(v.total);
    case 'present':
      return fmtNumber(v.present);
    case 'absent':
      return fmtNumber(v.absent);
    case 'late':
      return fmtNumber(v.late);
    case 'on_time':
      return fmtNumber(v.onTime);
    case 'attendance_rate':
      return v.total > 0 ? `${((v.present / v.total) * 100).toFixed(1)}%` : '0%';
    case 'weekly_off':
      return fmtNumber(v.weeklyOff);
    case 'half_day':
      return fmtNumber(v.halfDay);
    case 'day_shift':
      return fmtNumber(v.dayShiftPresent);
    case 'night_shift':
      return fmtNumber(v.nightShiftPresent);
    default:
      return '—';
  }
}

export function getMetricSub(id: DashboardKpiMetricId, v: KpiDayValues): string {
  switch (id) {
    case 'total_active':
      return 'across active employees';
    case 'present':
      return v.total > 0 ? `${Number(((v.present / v.total) * 100).toFixed(1))}% attendance` : '';
    case 'absent':
      return v.total > 0 ? `${Number(((v.absent / v.total) * 100).toFixed(1))}% absence` : '';
    case 'late':
      return 'after shift start';
    case 'on_time':
      return 'punctual arrivals';
    case 'attendance_rate':
      return `${fmtNumber(v.present)} present`;
    case 'weekly_off':
      return 'scheduled off';
    case 'half_day':
      return 'partial attendance';
    case 'day_shift':
      return 'present day workers';
    case 'night_shift':
      return 'present night workers';
    default:
      return '';
  }
}

export function getMetricTooltip(id: DashboardKpiMetricId): string {
  return getDashboardKpiTooltip(id);
}

export function getMetricPickerLabel(id: DashboardKpiMetricId, isCompliant = false): string {
  if (isCompliant && id === 'day_shift') return 'Shift A';
  if (isCompliant && id === 'night_shift') return 'Shift B+C';
  return METRIC_LABELS[id]({ weekday: '', total: 0, present: 0, absent: 0, late: 0, onTime: 0, weeklyOff: 0, halfDay: 0, dayShiftPresent: 0, nightShiftPresent: 0 });
}

export function kpiMetricToBarMetric(metric: DashboardKpiMetricId | null): BarMetric {
  if (metric === 'absent' || metric === 'weekly_off' || metric === 'half_day') return 'absent';
  if (metric === 'late') return 'late';
  return 'present';
}

export function applyMetricClick(
  metric: DashboardKpiMetricId,
  current: DashboardKpiFilterState
): DashboardKpiFilterState {
  if (metric === 'total_active') {
    return { statusFilter: 'All', shiftFilter: 'All', activeMetric: null };
  }

  if (metric === 'day_shift') {
    const togglingOff = current.activeMetric === 'day_shift';
    return {
      statusFilter: 'All',
      shiftFilter: togglingOff ? 'All' : 'Day',
      activeMetric: togglingOff ? null : 'day_shift',
    };
  }

  if (metric === 'night_shift') {
    const togglingOff = current.activeMetric === 'night_shift';
    return {
      statusFilter: 'All',
      shiftFilter: togglingOff ? 'All' : 'Night',
      activeMetric: togglingOff ? null : 'night_shift',
    };
  }

  const statusMap: Partial<Record<DashboardKpiMetricId, DashboardAttendanceStatusFilter>> = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    on_time: 'On Time',
    weekly_off: 'Weekly Off',
    half_day: 'Half Day',
    attendance_rate: 'Present',
  };

  const nextStatus = statusMap[metric] ?? 'All';
  const togglingOff = current.activeMetric === metric;
  return {
    statusFilter: togglingOff ? 'All' : nextStatus,
    shiftFilter: 'All',
    activeMetric: togglingOff ? null : metric,
  };
}

export function syncActiveMetricFromFilters(
  statusFilter: DashboardAttendanceStatusFilter,
  shiftFilter: DashboardShiftFilter
): DashboardKpiMetricId | null {
  if (shiftFilter === 'Day') return 'day_shift';
  if (shiftFilter === 'Night') return 'night_shift';
  if (statusFilter === 'Present') return 'present';
  if (statusFilter === 'Absent') return 'absent';
  if (statusFilter === 'Late') return 'late';
  if (statusFilter === 'On Time') return 'on_time';
  if (statusFilter === 'Weekly Off') return 'weekly_off';
  if (statusFilter === 'Half Day') return 'half_day';
  return null;
}

export function isMetricSelected(metric: DashboardKpiMetricId, state: DashboardKpiFilterState): boolean {
  if (metric === 'total_active') {
    return state.statusFilter === 'All' && state.shiftFilter === 'All' && state.activeMetric === null;
  }
  return state.activeMetric === metric;
}

export { ALL_DASHBOARD_KPI_METRICS };
