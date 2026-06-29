import { z } from 'zod';

export const NotificationKindSchema = z.enum([
  'visitor_submitted',
  'leave_applied',
  'device_registered',
]);
export type NotificationKind = z.infer<typeof NotificationKindSchema>;

export const NotificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});
export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;

export const NotificationItemSchema = z.object({
  id: z.string(),
  kind: NotificationKindSchema,
  title: z.string(),
  message: z.string(),
  href: z.string().nullable(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  payload: z.record(z.unknown()),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type NotificationItem = z.infer<typeof NotificationItemSchema>;

export const NotificationListResponseSchema = z.object({
  items: z.array(NotificationItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  unreadCount: z.number(),
});
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

export const NotificationUnreadCountResponseSchema = z.object({
  unreadCount: z.number(),
});
export type NotificationUnreadCountResponse = z.infer<typeof NotificationUnreadCountResponseSchema>;

/** Org-wide toggles for which events notify org admins (all default on). */
export const OrgNotificationAlertsSchema = z.object({
  visitorSubmitted: z.boolean(),
  leaveApplied: z.boolean(),
  deviceRegistered: z.boolean(),
});
export type OrgNotificationAlerts = z.infer<typeof OrgNotificationAlertsSchema>;

export const DEFAULT_ORG_NOTIFICATION_ALERTS: OrgNotificationAlerts = {
  visitorSubmitted: true,
  leaveApplied: true,
  deviceRegistered: true,
};

export function resolveOrgNotificationAlerts(
  raw?: Partial<OrgNotificationAlerts> | null
): OrgNotificationAlerts {
  return {
    visitorSubmitted: raw?.visitorSubmitted ?? true,
    leaveApplied: raw?.leaveApplied ?? true,
    deviceRegistered: raw?.deviceRegistered ?? true,
  };
}

export function isNotificationKindEnabled(
  alerts: OrgNotificationAlerts,
  kind: NotificationKind
): boolean {
  switch (kind) {
    case 'visitor_submitted':
      return alerts.visitorSubmitted;
    case 'leave_applied':
      return alerts.leaveApplied;
    case 'device_registered':
      return alerts.deviceRegistered;
  }
}
