import { api } from './client';
import type { ComplianceShift } from '@mams/types';

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

export interface ComplianceAttendanceListResponse {
  items: ComplianceAttendanceRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ComplianceAutogenResult {
  date: string;
  skippedSunday: boolean;
  generated: number;
  errors: number;
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
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)));
    return api.get<ComplianceAttendanceListResponse>(`/compliance-attendance?${params.toString()}`);
  },
  generate: (date?: string) => {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return api.post<ComplianceAutogenResult>(`/compliance-attendance/generate${qs}`);
  },
};
