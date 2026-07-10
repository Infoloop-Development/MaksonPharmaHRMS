import type { NotificationKind } from '@mams/types';

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  visitor_submitted: 'Visitor',
  leave_applied: 'Leave',
  device_registered: 'Device',
  bug_assigned: 'Bug assigned',
  bug_mentioned: 'Mention',
  bug_resolved: 'Bug resolved',
};

export const NOTIFICATION_KIND_STYLES: Record<NotificationKind, string> = {
  visitor_submitted: 'bg-primary-bg text-primary-on-bg',
  leave_applied: 'bg-amber-bg text-amber',
  device_registered: 'bg-green-bg text-green',
  bug_assigned: 'bg-primary-bg text-primary-on-bg',
  bug_mentioned: 'bg-amber-bg text-amber',
  bug_resolved: 'bg-green-bg text-green',
};

export function notificationToastMessage(title: string, message: string): string {
  return `${title}: ${message}`;
}
