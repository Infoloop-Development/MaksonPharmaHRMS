import type {
  DashboardAttendanceListResponse,
  DashboardAttendanceStatusFilter,
  DashboardAttendanceTimeShift,
  DashboardDepartmentsResponse,
  DashboardKpiConfig,
  DashboardLayout,
} from '@mams/types';
import { parseContentDispositionFilename } from '@mams/types';
import { api } from './client';
import { useAuth } from '../store/auth';

const apiRoot = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const BASE = (apiRoot ? apiRoot.replace(/\/$/, '') : '') + '/api';

export type DashboardAttendanceQueryParams = {
  date: string;
  search?: string;
  department?: string;
  timeShift?: DashboardAttendanceTimeShift;
  status?: DashboardAttendanceStatusFilter;
  page?: number;
  pageSize?: number;
};

function buildParams(q: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  return params.toString();
}

export interface DashboardStats {
  asOfDate: string;
  employees: { active: number; total: number };
  attendanceToday: { present: number; absent: number; attendanceRate: number };
  devices: { total: number; online: number };
  pendingAdjustments: number;
}

export interface WeekTrend {
  dates: string[];
  series: Record<string, { present: number; absent: number; weeklyOff: number }>;
}

export interface DashboardCharts {
  asOfDate: string;
  weekRange: { start: string; end: string };
  last7Days: {
    dates: string[];
    totalEmployees: number;
    present: number[];
    absent: number[];
    late: number[];
    weeklyOff: number[];
    halfDay: number[];
    dayShiftPresent: number[];
    nightShiftPresent: number[];
  };
  weekPunctuality: {
    date: string;
    onTime: number;
    delay: number;
    onLeave: number;
    totalActive: number;
  };
}

export const dashboardApi = {
  getLayout: () => api.get<DashboardLayout>('/dashboard/layout'),
  saveLayout: (layout: DashboardLayout) => api.put<DashboardLayout>('/dashboard/layout', layout),
  getKpi: () => api.get<DashboardKpiConfig>('/dashboard/kpi'),
  saveKpi: (config: DashboardKpiConfig) => api.put<DashboardKpiConfig>('/dashboard/kpi', config),
  stats: () => api.get<DashboardStats>('/dashboard/stats'),
  weekTrend: () => api.get<WeekTrend>('/dashboard/week-trend'),
  charts: (date?: string) =>
    api.get<DashboardCharts>(`/dashboard/charts${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  attendance: (q: DashboardAttendanceQueryParams) =>
    api.get<DashboardAttendanceListResponse>(`/dashboard/attendance?${buildParams(q)}`),
  departments: () => api.get<DashboardDepartmentsResponse>('/dashboard/attendance/departments'),
  downloadAttendanceXlsx: async (q: Omit<DashboardAttendanceQueryParams, 'page' | 'pageSize'>) => {
    const token = useAuth.getState().accessToken;
    const res = await fetch(`${BASE}/dashboard/attendance.xlsx?${buildParams(q)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error((payload as { message?: string }).message ?? `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      parseContentDispositionFilename(res.headers.get('Content-Disposition')) ??
      `Attendance_${q.date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
