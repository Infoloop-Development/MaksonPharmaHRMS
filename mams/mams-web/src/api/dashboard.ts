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

export const dashboardApi = {
  stats: () => api.get<DashboardStats>('/dashboard/stats'),
  weekTrend: () => api.get<WeekTrend>('/dashboard/week-trend'),
};
