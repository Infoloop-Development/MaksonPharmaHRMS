import { api } from './client';
import type { ComplianceAttendanceUpdate, ComplianceShift } from '@mams/types';
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

export interface ComplianceReportOverride {
  employeeId: string;
  totalHours: number;
}

export interface ComplianceReportRequest {
  yearMonth: string;
  overrides?: ComplianceReportOverride[];
}

export interface FinancialReportRequest {
  yearMonth: string;
}

export interface ReportJobCreated {
  jobId: string;
  status: 'queued';
}

export interface ReportJobStatus {
  jobId: string;
  type: 'compliance_monthly' | 'financial';
  status: 'queued' | 'running' | 'completed' | 'failed';
  yearMonth: string;
  filename?: string | null;
  errorMessage?: string | null;
  employeeCount?: number | null;
  processedCount?: number | null;
  createdAt?: string;
  completedAt?: string | null;
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
  createComplianceReportJob: (body: ComplianceReportRequest) =>
    api.post<ReportJobCreated>('/compliance-attendance/report-jobs', {
      type: 'compliance_monthly',
      yearMonth: body.yearMonth,
      overrides: body.overrides ?? [],
    }),
  createFinancialReportJob: (body: FinancialReportRequest) =>
    api.post<ReportJobCreated>('/compliance-attendance/report-jobs', {
      type: 'financial',
      yearMonth: body.yearMonth,
    }),
  getReportJob: (jobId: string) =>
    api.get<ReportJobStatus>(`/compliance-attendance/report-jobs/${jobId}`),
  downloadMonthlyReport: (body: ComplianceReportRequest) =>
    downloadAuthenticatedExportPost(
      '/compliance-attendance/report.xlsx',
      body,
      `compliance-attendance-${body.yearMonth}.xlsx`
    ),
  update: (id: string, body: ComplianceAttendanceUpdate) =>
    api.patch<ComplianceAttendanceRow>(`/compliance-attendance/${id}`, body),
  getMonthComplianceHours: (employeeId: string, yearMonth: string) => {
    const params = new URLSearchParams({ employeeId, yearMonth });
    return api.get<{ complianceHours: number }>(`/compliance-attendance/month-hours?${params.toString()}`);
  },
  downloadFinancialReport: (body: FinancialReportRequest) =>
    downloadAuthenticatedExportPost(
      '/compliance-attendance/financial-report.xlsx',
      body,
      `financial-report-${body.yearMonth}.xlsx`
    ),
};
