import { api } from './client';
import { downloadAuthenticatedExport } from '../lib/downloadExport';

export interface DailyReport {
  viewMode: 'real' | 'compliant';
  summary: { total: number; present: number; absent: number; weeklyOff: number; halfDay: number };
  rows: Array<Record<string, any>>;
  total: number;
  page: number;
  pageSize: number;
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
  daily: (
    q: {
      date?: string;
      startDate?: string;
      endDate?: string;
      department?: string;
      location?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) =>
    api.get<DailyReport>(
      `/reports/daily?${buildParams({ ...q, page: q.page?.toString(), pageSize: q.pageSize?.toString() })}`
    ),
  monthly: (q: { yearMonth: string; department?: string; location?: string }) =>
    api.get<MonthlyReport>(`/reports/monthly?${buildParams(q)}`),
  department: (q: { yearMonth?: string; startDate?: string; endDate?: string; location?: string } = {}) =>
    api.get<DepartmentReport>(`/reports/department?${buildParams(q)}`),
  location: (q: { yearMonth?: string; startDate?: string; endDate?: string; department?: string } = {}) =>
    api.get<LocationReport>(`/reports/location?${buildParams(q)}`),
  downloadDailyXlsx: (q: { date?: string; startDate?: string; endDate?: string; department?: string; location?: string } = {}) =>
    downloadAuthenticatedExport(`/reports/daily.xlsx?${buildParams(q)}`, 'daily-report.xlsx'),
  downloadMonthlyXlsx: (q: { yearMonth: string; department?: string; location?: string }) =>
    downloadAuthenticatedExport(`/reports/monthly.xlsx?${buildParams(q)}`, 'monthly-report.xlsx'),
  downloadDepartmentXlsx: (q: { yearMonth?: string } = {}) =>
    downloadAuthenticatedExport(`/reports/department.xlsx?${buildParams(q)}`, 'department-report.xlsx'),
  downloadLocationXlsx: (q: { yearMonth?: string } = {}) =>
    downloadAuthenticatedExport(`/reports/location.xlsx?${buildParams(q)}`, 'location-report.xlsx'),
};
