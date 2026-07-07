import type {
  BugPhase,
  BugPhaseCreateBody,
  BugPhasePatchBody,
  BugPhaseReorderBody,
  BugReportComment,
  BugReportCommentCreateBody,
  BugReportDetail,
  BugReportListQuery,
  BugReportListResponse,
  BugReportPatchBody,
} from '@mams/types';
import { api } from './client';

export const BUG_REPORTING_QUERY_KEY = ['admin', 'bug-reporting'] as const;
export const BUG_PHASES_QUERY_KEY = [...BUG_REPORTING_QUERY_KEY, 'phases'] as const;

export const adminBugReportingApi = {
  list: (q: Partial<BugReportListQuery>) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)));
    return api.get<BugReportListResponse>(`/admin/bug-reporting?${params.toString()}`);
  },
  getOne: (id: string) => api.get<BugReportDetail>(`/admin/bug-reporting/${id}`),
  patch: (id: string, body: BugReportPatchBody) =>
    api.patch<BugReportDetail>(`/admin/bug-reporting/${id}`, body),
  transcribe: (
    id: string,
    options?: { regenerate?: boolean; language?: 'auto' | 'en' | 'hi' | 'gu' }
  ) =>
    api.post<BugReportDetail>(`/admin/bug-reporting/${id}/transcribe`, {
      regenerate: options?.regenerate === true,
      language: options?.language ?? 'auto',
    }),
  modules: () => api.get<{ modules: string[] }>('/admin/bug-reporting/modules'),
  listAssignees: () =>
    api.get<{ items: { id: string; name: string; email: string; role: 'it.admin' }[] }>(
      '/admin/bug-reporting/assignees'
    ),
  phases: {
    list: () => api.get<{ phases: BugPhase[] }>('/admin/bug-reporting/phases'),
    create: (body: BugPhaseCreateBody) =>
      api.post<BugPhase>('/admin/bug-reporting/phases', body),
    patch: (id: string, body: BugPhasePatchBody) =>
      api.patch<BugPhase>(`/admin/bug-reporting/phases/${id}`, body),
    reorder: (body: BugPhaseReorderBody) =>
      api.put<{ phases: BugPhase[] }>('/admin/bug-reporting/phases/reorder', body),
    delete: (id: string, reassignToPhaseId?: string) =>
      api.delete<{ ok: true }>(`/admin/bug-reporting/phases/${id}`, { reassignToPhaseId }),
  },
  comments: {
    list: (reportId: string) =>
      api.get<{ comments: BugReportComment[] }>(`/admin/bug-reporting/${reportId}/comments`),
    create: (
      reportId: string,
      body: BugReportCommentCreateBody,
      image?: File
    ) => {
      const form = new FormData();
      form.append('body', body.body);
      if (body.parentId) form.append('parentId', body.parentId);
      if (body.mentionUserIds?.length) {
        form.append('mentionUserIds', JSON.stringify(body.mentionUserIds));
      }
      if (image) form.append('image', image);
      return api.postForm<BugReportComment>(`/admin/bug-reporting/${reportId}/comments`, form);
    },
  },
};
