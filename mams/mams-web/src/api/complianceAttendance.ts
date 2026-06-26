import { api } from './client';
import type { ComplianceShift } from '@mams/types';
import { downloadAuthenticatedExportPost } from '../lib/downloadExport';

export interface ComplianceAttendanceRow {
  _id: string;
  date: string;
  alternateShift: ComplianceShift;
  checkInAt: string;
  checkOutAt: string;
  checkOutNextDay: boolean;
  hoursWorked: number;
  status: string;
  employeeId?: {
    _id: string;
    name: string;
    empCode: string;
    department: string;
    alternateShift?: ComplianceShift;
  } | null;
}

export interface ComplianceAttendanceStats {
  total: number;
  byShift: Record<ComplianceShift, number>;
  scope: 'today' | 'date' | 'range';
  scopeDate?: string;
}

export interface ComplianceAttendanceListResponse {
  items: ComplianceAttendanceRow[];
  total: number;
  page: number;
  pageSize: number;
  stats: ComplianceAttendanceStats;
}

export interface ComplianceAutogenResult {
  date: string;
  skippedSunday: boolean;
  generated: number;
  errors: number;
}

export interface ComplianceAutogenMonthResult {
  yearMonth: string;
  weekdaysProcessed: number;
  generated: number;
  errors: number;
}

export interface ComplianceReportEmployee {
  employeeId: string;
  empCode: string;
  name: string;
  department: string;
  alternateShift: ComplianceShift;
  totalHours: number;
}

export interface ComplianceReportRequest {
  yearMonth: string;
  employees: ComplianceReportEmployee[];
}

export const complianceAttendanceApi = {
  list: (q: {
    date?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    alternateShift?: ComplianceShift;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)));
    return api.get<ComplianceAttendanceListResponse>(`/compliance-attendance?${params.toString()}`);
  },
  generate: (date?: string) => {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return api.post<ComplianceAutogenResult>(`/compliance-attendance/generate${qs}`);
  },
  generateMonth: (yearMonth: string) =>
    api.post<ComplianceAutogenMonthResult>(
      `/compliance-attendance/generate-month?yearMonth=${encodeURIComponent(yearMonth)}`
    ),
  downloadMonthlyReport: (body: ComplianceReportRequest) =>
    downloadAuthenticatedExportPost(
      '/compliance-attendance/report.xlsx',
      body,
      `compliance-attendance-${body.yearMonth}.xlsx`
    ),
};
