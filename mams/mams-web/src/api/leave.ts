import { api } from './client';
import type {
  HolidayCreate,
  HolidayPatch,
  LeaveApplicationCreate,
  LeaveQuotaAdjust,
  LeaveQuotaApplyDefault,
  LeaveQuotaResetPolicy,
  LeaveStatus,
  LeaveTypeCreate,
  LeaveTypePatch,
} from '@mams/types';

export interface LeaveSummary {
  leavesToday: number;
  leavesTodayNames: string[];
  pendingApprovals: number;
  upcomingLeaves7Days: number;
  leavesThisMonth: number;
}

export interface LeaveTypeItem {
  id: string;
  code: string;
  name: string;
  paid: boolean;
  halfDayEligible: boolean;
  maxConsecutiveDays: number | null;
  requiresDocument: boolean;
  annualQuotaDefault: number;
  active: boolean;
  sortOrder: number;
}

export interface LeaveApplicationItem {
  _id: string;
  employeeId: { _id: string; name: string; empCode: string; department?: string; location?: string } | null;
  leaveTypeId: { _id: string; name: string; code?: string; paid?: boolean } | null;
  fromDate: string;
  toDate: string;
  totalDays: number;
  halfDayPortion?: 'first' | 'second' | null;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
  approverNote?: string | null;
  excludedHolidayDates?: string[];
}

export interface QuotaListItem {
  id: string;
  employeeId: { _id: string; name: string; empCode: string } | null;
  leaveTypeId: { _id: string; name: string; code?: string } | null;
  periodKey: string;
  entitled: number;
  consumed: number;
  manualAdjustment: number;
  remaining: number;
}

export interface QuotaPreview {
  entitled: number;
  consumed: number;
  manualAdjustment: number;
  remaining: number;
  periodKey: string;
  paid: boolean;
  leaveTypeName: string;
}

export const leaveApi = {
  summary: () => api.get<LeaveSummary>('/leave/summary'),

  listApplications: (params: {
    search?: string;
    employeeId?: string;
    leaveTypeId?: string;
    status?: LeaveStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.employeeId) q.set('employeeId', params.employeeId);
    if (params.leaveTypeId) q.set('leaveTypeId', params.leaveTypeId);
    if (params.status) q.set('status', params.status);
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    const qs = q.toString();
    return api.get<{ items: LeaveApplicationItem[]; total: number; page: number; pageSize: number }>(
      `/leave/applications${qs ? `?${qs}` : ''}`
    );
  },

  getApplication: (id: string) => api.get<LeaveApplicationItem & { ledger?: unknown[] }>(`/leave/applications/${id}`),

  createApplication: (body: LeaveApplicationCreate) =>
    api.post<LeaveApplicationItem>('/leave/applications', body),

  approve: (id: string, note?: string) =>
    api.patch<LeaveApplicationItem>(`/leave/applications/${id}/approve`, { note }),

  reject: (id: string, note: string) =>
    api.patch<LeaveApplicationItem>(`/leave/applications/${id}/reject`, { note }),

  cancel: (id: string, note?: string) =>
    api.patch<LeaveApplicationItem>(`/leave/applications/${id}/cancel`, { note }),

  exportCsvUrl: (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) q.set(k, v);
    }
    return `/api/leave/applications/export.csv?${q.toString()}`;
  },

  listTypes: () => api.get<{ items: LeaveTypeItem[] }>('/leave/types'),
  createType: (body: LeaveTypeCreate) => api.post<LeaveTypeItem>('/leave/types', body),
  patchType: (id: string, body: LeaveTypePatch) => api.patch<LeaveTypeItem>(`/leave/types/${id}`, body),
  seedDefaultTypes: () => api.post<{ seeded: number }>('/leave/types/seed-defaults', {}),

  quotaPreview: (employeeId: string, leaveTypeId: string, asOfDate?: string) => {
    const q = new URLSearchParams({ employeeId, leaveTypeId });
    if (asOfDate) q.set('asOfDate', asOfDate);
    return api.get<QuotaPreview>(`/leave/quota/preview?${q}`);
  },

  listQuota: (employeeId?: string) => {
    const q = employeeId ? `?employeeId=${employeeId}` : '';
    return api.get<{ items: QuotaListItem[] }>(`/leave/quota${q}`);
  },

  adjustQuota: (body: LeaveQuotaAdjust) => api.post('/leave/quota/adjust', body),
  applyDefaultQuota: (body: LeaveQuotaApplyDefault) => api.post('/leave/quota/apply-default-policy', body),

  listHolidays: (year?: string) => {
    const q = year ? `?year=${year}` : '';
    return api.get<{ items: { id: string; name: string; date: string; type: string; departments: string[]; locations: string[] }[] }>(
      `/leave/holidays${q}`
    );
  },
  createHoliday: (body: HolidayCreate) => api.post('/leave/holidays', body),
  patchHoliday: (id: string, body: HolidayPatch) => api.patch(`/leave/holidays/${id}`, body),
  deleteHoliday: (id: string) => api.delete(`/leave/holidays/${id}`),
  importHolidaysCsv: (rows: HolidayCreate[]) => api.post<{ imported: number }>('/leave/holidays/import-csv', { rows }),

  getPolicy: () =>
    api.get<{ leaveQuotaResetPolicy: LeaveQuotaResetPolicy; financialYearStartMonth: number }>('/leave/settings/policy'),
  patchPolicy: (body: { leaveQuotaResetPolicy?: LeaveQuotaResetPolicy; financialYearStartMonth?: number }) =>
    api.patch('/leave/settings/policy', body),
};
