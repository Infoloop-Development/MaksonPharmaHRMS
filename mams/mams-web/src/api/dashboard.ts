import { api } from './client';

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
  };
  weekPunctuality: {
    onTime: number;
    delay: number;
    onLeave: number;
    totalActive: number;
  };
}

export const dashboardApi = {
  stats: () => api.get<DashboardStats>('/dashboard/stats'),
  weekTrend: () => api.get<WeekTrend>('/dashboard/week-trend'),
  charts: () => api.get<DashboardCharts>('/dashboard/charts'),
};
