import { api } from './client';
import type {
  RegularizationApprove,
  RegularizationCreate,
  RegularizationReject,
  RegularizationStatus,
  RegularizationType,
} from '@mams/types';

export interface RegularizationListItem {
  _id: string;
  employeeId: { _id: string; name: string; empCode: string; department: string; location: string } | string;
  date: string;
  type: RegularizationType;
  requestedInTime: string | null;
  requestedOutTime: string | null;
  reason: string;
  remarks: string | null;
  status: RegularizationStatus;
  initiatedBy: { _id: string; name: string; email: string } | string;
  initiatedAt: string;
  decidedBy: { _id: string; name: string; email: string } | string | null;
  decidedAt: string | null;
  approverNote: string | null;
  appliedRawIds: string[];
}

export interface RegularizationListResponse {
  items: RegularizationListItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: { Pending: number; Approved: number; Rejected: number };
}

export interface RegularizationPreviewResponse {
  employee: { id: string; name: string; empCode: string };
  date: string;
  derived: {
    status: string;
    realEntryAt: string | null;
    realExitAt: string | null;
    dayType: string;
  } | null;
  rawPunchCount: number;
  rawPunches: Array<{ punchType: string; time: string; source: string }>;
}

export const regularizationApi = {
  list: (q: {
    status?: RegularizationStatus;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)));
    return api.get<RegularizationListResponse>(`/regularization?${params}`);
  },
  preview: (employeeId: string, date: string) =>
    api.get<RegularizationPreviewResponse>(
      `/regularization/preview?${new URLSearchParams({ employeeId, date })}`
    ),
  create: (body: RegularizationCreate) => api.post<RegularizationListItem>('/regularization', body),
  approve: (id: string, body: RegularizationApprove = {}) =>
    api.patch<RegularizationListItem>(`/regularization/${id}/approve`, body),
  reject: (id: string, body: RegularizationReject) =>
    api.patch<RegularizationListItem>(`/regularization/${id}/reject`, body),
};
