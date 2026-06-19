import type { ActivityListResponse, OrgActivityListQuery, UiActivityLogBody } from '@mams/types';
import { api } from './client';

export const activityApi = {
  listMine: (q: { page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (q.page) params.set('page', String(q.page));
    if (q.pageSize) params.set('pageSize', String(q.pageSize));
    const qs = params.toString();
    return api.get<ActivityListResponse>(`/activity/me${qs ? `?${qs}` : ''}`);
  },
  listOrg: (q: Partial<OrgActivityListQuery> = {}) => {
    const params = new URLSearchParams();
    if (q.page) params.set('page', String(q.page));
    if (q.pageSize) params.set('pageSize', String(q.pageSize));
    if (q.userId) params.set('userId', q.userId);
    if (q.role) params.set('role', q.role);
    if (q.eventType) params.set('eventType', q.eventType);
    if (q.entityType) params.set('entityType', q.entityType);
    if (q.from) params.set('from', q.from);
    if (q.to) params.set('to', q.to);
    if (q.search) params.set('search', q.search);
    if (q.category) params.set('category', q.category);
    const qs = params.toString();
    return api.get<ActivityListResponse>(`/activity/org${qs ? `?${qs}` : ''}`);
  },
  logUi: (body: UiActivityLogBody) => api.post<{ ok: boolean }>('/activity/log', body),
};

/** Prefix for invalidating/removing all per-user activity queries. */
export const ACTIVITY_QUERY_PREFIX = ['activity', 'me'] as const;
export const ORG_ACTIVITY_QUERY_PREFIX = ['activity', 'org'] as const;

export function activityQueryKey(userId: string | undefined, page?: number) {
  return page !== undefined
    ? (['activity', 'me', userId ?? '', page] as const)
    : (['activity', 'me', userId ?? ''] as const);
}
