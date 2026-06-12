import { api } from './client';
import type {
  VisitorField,
  VisitorFormCreate,
  VisitorFormUpdate,
  VisitorRequestApprove,
  VisitorRequestReject,
  VisitorRequestStatus,
} from '@mams/types';

export interface VisitorFormItem {
  _id: string;
  title: string;
  description: string | null;
  publicSlug: string;
  publicUrl: string;
  formVersion: number;
  fields: VisitorField[];
  isActive: boolean;
  submissionCount: number;
  createdAt?: string;
  updatedAt?: string;
  slugRegenerated?: boolean;
}

export interface VisitorRequestListItem {
  _id: string;
  formId: { _id: string; title: string; publicSlug: string } | string;
  formVersion: number;
  publicSlug: string;
  formTitle: string;
  fieldsSnapshot: VisitorField[];
  responses: Record<string, string | string[] | null>;
  fileAttachments: Array<{
    fieldId: string;
    filename: string;
    mimeType: string;
    size: number;
    storageKey: string;
  }>;
  status: VisitorRequestStatus;
  submittedAt: string;
  decidedBy: { _id: string; name: string; email: string } | string | null;
  decidedAt: string | null;
  approverNote: string | null;
}

export interface VisitorRequestListResponse {
  items: VisitorRequestListItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: { Pending: number; Approved: number; Rejected: number };
}

export interface VisitorAuditEntry {
  _id: string;
  eventType: string;
  occurredAt: string;
  userId: { _id: string; name: string; email: string } | string | null;
  payload: Record<string, unknown>;
}

export interface VisitorRequestDetailResponse {
  item: VisitorRequestListItem;
  auditTrail: VisitorAuditEntry[];
}

export const visitorsApi = {
  listFormSummaries: () =>
    api.get<{ items: Array<{ _id: string; title: string; publicSlug: string }> }>('/visitors/forms/summary'),
  listForms: () => api.get<{ items: VisitorFormItem[] }>('/visitors/forms'),
  getForm: (id: string) => api.get<VisitorFormItem>(`/visitors/forms/${id}`),
  createForm: (body: VisitorFormCreate) => api.post<VisitorFormItem>('/visitors/forms', body),
  updateForm: (id: string, body: VisitorFormUpdate) =>
    api.patch<VisitorFormItem>(`/visitors/forms/${id}`, body),
  toggleFormActive: (id: string) => api.patch<VisitorFormItem>(`/visitors/forms/${id}/toggle-active`),
  deleteForm: (id: string) => api.delete<void>(`/visitors/forms/${id}`),

  listRequests: (q: {
    status?: VisitorRequestStatus;
    formId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)));
    return api.get<VisitorRequestListResponse>(`/visitors/requests?${params}`);
  },
  getRequest: (id: string) => api.get<VisitorRequestDetailResponse>(`/visitors/requests/${id}`),
  approveRequest: (id: string, body: VisitorRequestApprove = {}) =>
    api.patch<VisitorRequestListItem>(`/visitors/requests/${id}/approve`, body),
  rejectRequest: (id: string, body: VisitorRequestReject) =>
    api.patch<VisitorRequestListItem>(`/visitors/requests/${id}/reject`, body),
  fileUrl: (storageKey: string) => `/api/visitors/files/${encodeURIComponent(storageKey)}`,
};
