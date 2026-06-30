import { api } from './client';
import type { EmployeeChangeRequestBody, EmployeeChangeRequestReview } from '@mams/types';

export const employeeChangeRequestsApi = {
  list(params?: {
    status?: 'Flagged' | 'Reviewed';
    changeType?: 'create' | 'update' | 'delete';
    employeeId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.changeType) q.set('changeType', params.changeType);
    if (params?.employeeId) q.set('employeeId', params.employeeId);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    return api.get<{
      items: Record<string, unknown>[];
      total: number;
      page: number;
      pageSize: number;
      counts: { Flagged: number; Reviewed: number };
    }>(`/employee-change-requests?${q}`);
  },

  submit(body: EmployeeChangeRequestBody) {
    return api.post<{ _id: string }>('/employee-change-requests', body);
  },

  review(id: string, body: EmployeeChangeRequestReview) {
    return api.post<Record<string, unknown>>(`/employee-change-requests/${id}/review`, body);
  },
};
