import { api } from './client';

export interface DailyReport {
  viewMode: 'real' | 'compliant';
  summary: { total: number; present: number; absent: number; weeklyOff: number; halfDay: number };
  rows: Array<Record<string, any>>;
}

export interface MonthlyReport {
  viewMode: 'real' | 'compliant';
  yearMonth: string;
  rows: Array<{
    employeeId: string;
    empCode: string;
    name: string;
    department: string;
    location: string;
    presentDays: number;
    absentDays: number;
    weeklyOffDays: number;
    totalCompliantHours: number;
    totalRealNetHours: number;
    totalOtHours: number;
    equivalentDays: number;
  }>;
}

export interface DepartmentReport {
  viewMode: 'real' | 'compliant';
  rows: Array<{
    department: string;
    totalRecords: number;
    presentDays: number;
    absentDays: number;
    weeklyOffDays: number;
    totalCompliantHours: number;
    totalRealNetHours: number;
    totalOtHours: number;
    employeeCount: number;
    attendanceRate: number;
  }>;
}

export interface LocationReport {
  viewMode: 'real' | 'compliant';
  rows: Array<{
    location: string;
    totalRecords: number;
    presentDays: number;
    absentDays: number;
    totalCompliantHours: number;
    totalOtHours: number;
    employeeCount: number;
    attendanceRate: number;
  }>;
}

function buildParams(q: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, v));
  return params.toString();
}

export const reportsApi = {
  daily: (q: { date?: string; startDate?: string; endDate?: string; department?: string; location?: string } = {}) =>
    api.get<DailyReport>(`/reports/daily?${buildParams(q)}`),
  monthly: (q: { yearMonth: string; department?: string; location?: string }) =>
    api.get<MonthlyReport>(`/reports/monthly?${buildParams(q)}`),
  department: (q: { yearMonth?: string; startDate?: string; endDate?: string; location?: string } = {}) =>
    api.get<DepartmentReport>(`/reports/department?${buildParams(q)}`),
  location: (q: { yearMonth?: string; startDate?: string; endDate?: string; department?: string } = {}) =>
    api.get<LocationReport>(`/reports/location?${buildParams(q)}`),
  dailyCsvUrl: (q: { date?: string; startDate?: string; endDate?: string; department?: string; location?: string } = {}) =>
    `/api/reports/daily.csv?${buildParams(q)}`,
};
