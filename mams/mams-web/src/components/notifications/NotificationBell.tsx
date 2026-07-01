import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { NotificationItem } from '@mams/types';
import { hasOrgAdminLikeAccess } from '@mams/types';
import { useAuth } from '../../store/auth';
import { notificationsApi, notificationsQueryKey, NOTIFICATIONS_QUERY_PREFIX } from '../../api/notifications';
import { useToast } from '../ui/Toast';
import { fmtIstDateTimeMs } from '../../lib/format';
import {
  NOTIFICATION_KIND_LABELS,
  NOTIFICATION_KIND_STYLES,
  notificationToastMessage,
} from '../../lib/notificationLabels';

const PAGE_SIZE = 20;
const POLL_MS = 30_000;
const TOAST_RECENT_MS = POLL_MS + 5_000;

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function NotificationRow({
  item,
  onSelect,
}: {
  item: NotificationItem;
  onSelect: (item: NotificationItem) => void;
}) {
  const unread = item.readAt == null;
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`w-full text-left px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-surface2 transition-colors ${
        unread ? 'bg-primary-bg/20' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${NOTIFICATION_KIND_STYLES[item.kind]}`}
        >
          {NOTIFICATION_KIND_LABELS[item.kind]}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`text-sm truncate ${unread ? 'font-semibold text-text' : 'text-text'}`}>
            {item.title}
          </div>
          <div className="text-xs text-text-muted line-clamp-2 mt-0.5">{item.message}</div>
          <div className="text-[10px] text-text-subtle mt-1">{fmtIstDateTimeMs(item.createdAt)}</div>
        </div>
        {unread && (
          <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" aria-label="Unread" />
        )}
      </div>
    </button>
  );
}

export function NotificationBell() {
  const user = useAuth((s) => s.user);
  const pushToast = useToast((s) => s.push);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const rootRef = useRef<HTMLDivElement>(null);
  const toastedIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  const enabled = Boolean(user && hasOrgAdminLikeAccess(user.role));

  const { data, isLoading } = useQuery({
    queryKey: notificationsQueryKey(user?.id, pageSize),
    queryFn: () => notificationsApi.list({ page: 1, pageSize }),
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_PREFIX });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_PREFIX });
    },
  });

  useEffect(() => {
    if (!enabled || !data?.items) return;

    if (initialLoadRef.current) {
      for (const item of data.items) {
        if (item.readAt == null) toastedIdsRef.current.add(item.id);
      }
      initialLoadRef.current = false;
      return;
    }

    const now = Date.now();
    for (const item of data.items) {
      if (item.readAt != null || toastedIdsRef.current.has(item.id)) continue;
      const age = now - new Date(item.createdAt).getTime();
      if (age > TOAST_RECENT_MS) continue;
      toastedIdsRef.current.add(item.id);
      pushToast(notificationToastMessage(item.title, item.message), 'info');
    }
  }, [data?.items, enabled, pushToast]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const handleSelect = useCallback(
    (item: NotificationItem) => {
      if (item.readAt == null) {
        markReadMutation.mutate(item.id);
      }
      setOpen(false);
      if (item.href) navigate(item.href);
    },
    [markReadMutation, navigate]
  );

  if (!enabled) return null;

  const unreadCount = data?.unreadCount ?? 0;
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const hasMore = data ? data.items.length < data.total : false;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="relative"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-red text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+0.375rem)] z-50 w-[min(calc(100vw-1rem),22rem)] rounded-lg border border-border bg-surface shadow-floating overflow-hidden"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-surface2">
            <h2 className="text-sm font-semibold text-text">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline shrink-0"
                disabled={markAllReadMutation.isPending}
                onClick={() => markAllReadMutation.mutate()}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {isLoading && !data && (
              <div className="px-3 py-6 text-sm text-text-muted text-center">Loading…</div>
            )}
            {data && data.items.length === 0 && (
              <div className="px-3 py-6 text-sm text-text-muted text-center">No notifications yet.</div>
            )}
            {data?.items.map((item) => (
              <NotificationRow key={item.id} item={item} onSelect={handleSelect} />
            ))}
          </div>

          {hasMore && (
            <div className="border-t border-border px-3 py-2 bg-surface2">
              <button
                type="button"
                className="w-full text-xs text-primary hover:underline py-1"
                onClick={() => setPageSize((s) => s + PAGE_SIZE)}
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
