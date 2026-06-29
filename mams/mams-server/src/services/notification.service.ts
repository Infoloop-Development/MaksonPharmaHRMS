import { Types } from 'mongoose';
import type { NotificationKind, NotificationListQuery, OrgNotificationAlerts } from '@mams/types';
import { isNotificationKindEnabled, resolveOrgNotificationAlerts } from '@mams/types';
import { NotificationModel } from '../models/Notification.js';
import { SettingsModel } from '../models/Settings.js';
import { UserModel } from '../models/User.js';
import { ApiError } from '../middleware/error.js';
import { logger } from '../utils/logger.js';

export interface NotifyOrgAdminsInput {
  kind: NotificationKind;
  title: string;
  message: string;
  href?: string | null;
  entityType?: string | null;
  entityId?: Types.ObjectId | string | null;
  payload?: Record<string, unknown>;
}

function toNotificationItem(doc: {
  _id: Types.ObjectId;
  kind: string;
  title: string;
  message: string;
  href?: string | null;
  entityType?: string | null;
  entityId?: Types.ObjectId | null;
  payload?: Record<string, unknown>;
  readAt?: Date | null;
  createdAt?: Date;
}) {
  return {
    id: String(doc._id),
    kind: doc.kind as NotificationKind,
    title: doc.title,
    message: doc.message,
    href: doc.href ?? null,
    entityType: doc.entityType ?? null,
    entityId: doc.entityId ? String(doc.entityId) : null,
    payload: (doc.payload ?? {}) as Record<string, unknown>,
    readAt: doc.readAt ? doc.readAt.toISOString() : null,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}

export async function notifyOrgAdmins(input: NotifyOrgAdminsInput): Promise<void> {
  try {
    const settings = await SettingsModel.findOne().select('orgNotificationAlerts').lean();
    const alerts = resolveOrgNotificationAlerts(
      settings?.orgNotificationAlerts as Partial<OrgNotificationAlerts> | undefined
    );
    if (!isNotificationKindEnabled(alerts, input.kind)) return;

    const admins = await UserModel.find({ role: 'org.admin', isActive: true }).select('_id').lean();
    if (admins.length === 0) return;

    const entityId =
      input.entityId == null
        ? null
        : typeof input.entityId === 'string'
          ? new Types.ObjectId(input.entityId)
          : input.entityId;

    await NotificationModel.insertMany(
      admins.map((admin) => ({
        userId: admin._id,
        kind: input.kind,
        title: input.title,
        message: input.message,
        href: input.href ?? null,
        entityType: input.entityType ?? null,
        entityId,
        payload: input.payload ?? {},
        readAt: null,
      }))
    );
  } catch (err) {
    logger.warn('Failed to notify org admins', { err, kind: input.kind });
  }
}

export async function listForUser(userId: string, q: NotificationListQuery) {
  const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
  if (q.unreadOnly) filter.readAt = null;

  const skip = (q.page - 1) * q.pageSize;
  const [items, total, unreadCount] = await Promise.all([
    NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.pageSize).lean(),
    NotificationModel.countDocuments(filter),
    NotificationModel.countDocuments({ userId: new Types.ObjectId(userId), readAt: null }),
  ]);

  return {
    items: items.map(toNotificationItem),
    total,
    page: q.page,
    pageSize: q.pageSize,
    unreadCount,
  };
}

export async function unreadCountForUser(userId: string): Promise<number> {
  return NotificationModel.countDocuments({ userId: new Types.ObjectId(userId), readAt: null });
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  if (!Types.ObjectId.isValid(notificationId)) {
    throw new ApiError(400, 'invalid_id', 'Invalid notification id');
  }
  const result = await NotificationModel.updateOne(
    { _id: new Types.ObjectId(notificationId), userId: new Types.ObjectId(userId), readAt: null },
    { $set: { readAt: new Date() } }
  );
  if (result.matchedCount === 0) {
    throw new ApiError(404, 'not_found', 'Notification not found');
  }
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await NotificationModel.updateMany(
    { userId: new Types.ObjectId(userId), readAt: null },
    { $set: { readAt: new Date() } }
  );
  return result.modifiedCount;
}

export function buildVisitorSubmittedNotification(opts: {
  formTitle: string;
  publicSlug: string;
  entityId: Types.ObjectId | string;
}): NotifyOrgAdminsInput {
  return {
    kind: 'visitor_submitted',
    title: 'Visitor request submitted',
    message: `New visitor request for "${opts.formTitle}" (${opts.publicSlug})`,
    href: '/visitors',
    entityType: 'visitor_request',
    entityId: opts.entityId,
    payload: { formTitle: opts.formTitle, publicSlug: opts.publicSlug },
  };
}

export function buildLeaveAppliedNotification(opts: {
  employeeName: string;
  status: string;
  totalDays: number;
  entityId: Types.ObjectId | string;
}): NotifyOrgAdminsInput {
  const pending = opts.status === 'Pending';
  return {
    kind: 'leave_applied',
    title: pending ? 'Leave pending approval' : 'Leave application recorded',
    message: pending
      ? `${opts.employeeName} submitted leave (${opts.totalDays} day${opts.totalDays === 1 ? '' : 's'}), pending approval`
      : `${opts.employeeName}: leave recorded (${opts.totalDays} day${opts.totalDays === 1 ? '' : 's'})`,
    href: '/leave',
    entityType: 'leave_application',
    entityId: opts.entityId,
    payload: { employeeName: opts.employeeName, status: opts.status, totalDays: opts.totalDays },
  };
}

export function buildDeviceRegisteredNotification(opts: {
  name: string;
  serialNumber: string;
  model: string;
  vendor: string;
  entityId: Types.ObjectId | string;
}): NotifyOrgAdminsInput {
  return {
    kind: 'device_registered',
    title: 'New device registered',
    message: `${opts.name} (${opts.serialNumber}): ${opts.model}, ${opts.vendor}`,
    href: '/devices',
    entityType: 'device',
    entityId: opts.entityId,
    payload: {
      name: opts.name,
      serialNumber: opts.serialNumber,
      model: opts.model,
      vendor: opts.vendor,
    },
  };
}
