import type { ActivityListResponse, UiActivityLogBody } from '@mams/types';
import { api } from './client';

export const activityApi = {
  listMine: (q: { page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (q.page) params.set('page', String(q.page));
    if (q.pageSize) params.set('pageSize', String(q.pageSize));
    const qs = params.toString();
    return api.get<ActivityListResponse>(`/activity/me${qs ? `?${qs}` : ''}`);
  },
  logUi: (body: UiActivityLogBody) => api.post<{ ok: boolean }>('/activity/log', body),
};

/** Prefix for invalidating/removing all per-user activity queries. */
export const ACTIVITY_QUERY_PREFIX = ['activity', 'me'] as const;

export function activityQueryKey(userId: string | undefined, page?: number) {
  return page !== undefined
    ? (['activity', 'me', userId ?? '', page] as const)
    : (['activity', 'me', userId ?? ''] as const);
}
