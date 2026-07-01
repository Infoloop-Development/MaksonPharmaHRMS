import type {
  BulkMutationResult,
  RecycleBinBulkBody,
  RecycleBinListQuery,
  RecycleBinListResponse,
} from '@mams/types';
import { api } from './client';

export const RECYCLE_BIN_QUERY_KEY = ['admin', 'recycle-bin'] as const;

export const recycleBinApi = {
  list: (q: Partial<RecycleBinListQuery>) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)));
    return api.get<RecycleBinListResponse>(`/admin/recycle-bin?${params.toString()}`);
  },
  restore: (body: RecycleBinBulkBody) =>
    api.post<BulkMutationResult>('/admin/recycle-bin/restore', body),
  purge: (body: RecycleBinBulkBody) =>
    api.post<BulkMutationResult>('/admin/recycle-bin/purge', body),
};
