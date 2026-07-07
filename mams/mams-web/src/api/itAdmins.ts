import type { ItAdminCreateBody, ItAdminCreateResponse, ItAdminListResponse } from '@mams/types';
import { api } from './client';

export const IT_ADMINS_QUERY_KEY = ['admin', 'it-admins'] as const;

export const itAdminsApi = {
  list: () => api.get<ItAdminListResponse>('/admin/it-admins'),
  create: (body: ItAdminCreateBody) => api.post<ItAdminCreateResponse>('/admin/it-admins', body),
};
