import { api } from './client';
import type { AdjustmentCreate, AdjustmentDecision, AdjustmentPublic } from '@mams/types';

export interface AdjustmentListItem extends Omit<AdjustmentPublic, 'employeeId' | 'initiatedBy' | 'decidedBy'> {
  _id: string;
  employeeId: { _id: string; name: string; empCode: string; department: string; location: string } | string;
  initiatedBy: { _id: string; name: string; email: string } | string;
  decidedBy: { _id: string; name: string; email: string } | string | null;
}

export interface AdjustmentListResponse {
  items: AdjustmentListItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: { Pending: number; Approved: number; Rejected: number };
}

export const adjustmentsApi = {
  list: (q: {
    status?: 'Pending' | 'Approved' | 'Rejected';
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)));
    return api.get<AdjustmentListResponse>(`/adjustments?${params}`);
  },
  create: (body: AdjustmentCreate) => api.post<AdjustmentListItem>('/adjustments', body),
  decide: (id: string, body: AdjustmentDecision) => api.post<AdjustmentListItem>(`/adjustments/${id}/decide`, body),
  bulkDecide: (ids: string[], decision: 'approve' | 'reject', approverNote?: string) =>
    api.post<{ approved: number; rejected: number; skipped: number; errors: Array<{ id: string; reason: string }> }>(
      '/adjustments/bulk-decide',
      { ids, decision, approverNote }
    ),
};
