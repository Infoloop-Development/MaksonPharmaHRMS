import type { NotificationListResponse } from '@mams/types';
import { api } from './client';

export const NOTIFICATIONS_QUERY_PREFIX = ['notifications'] as const;

export function notificationsQueryKey(userId: string | undefined, page = 1) {
  return ['notifications', userId ?? '', page] as const;
}

export const notificationsApi = {
  list: (q: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (q.page) params.set('page', String(q.page));
    if (q.pageSize) params.set('pageSize', String(q.pageSize));
    if (q.unreadOnly) params.set('unreadOnly', 'true');
    const qs = params.toString();
    return api.get<NotificationListResponse>(`/notifications${qs ? `?${qs}` : ''}`);
  },
  markRead: (id: string) => api.patch<{ ok: boolean }>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<{ ok: boolean; modifiedCount: number }>('/notifications/read-all'),
};
