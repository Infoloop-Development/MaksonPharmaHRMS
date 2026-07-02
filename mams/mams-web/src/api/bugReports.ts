import type { BugReportCreateBody } from '@mams/types';
import { api } from './client';

export const bugReportsApi = {
  submit: (body: BugReportCreateBody) => api.post<{ id: string }>('/bug-reports', body),
};
