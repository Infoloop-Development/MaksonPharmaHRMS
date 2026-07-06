import type {
  BugReportDetail,
  BugReportListQuery,
  BugReportListResponse,
  BugReportPatchBody,
} from '@mams/types';
import { api } from './client';

export const BUG_REPORTING_QUERY_KEY = ['admin', 'bug-reporting'] as const;

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
};
