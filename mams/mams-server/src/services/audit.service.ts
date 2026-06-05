import type { Types } from 'mongoose';
import { SENSITIVE_UNMASK_FIELD_LABELS, type SensitiveUnmaskField } from '@mams/types';
import { AuditLogModel } from '../models/AuditLog.js';
import { UnmaskAuditModel } from '../models/UnmaskAudit.js';

interface AuditCtx {
  userId?: Types.ObjectId | string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function audit(
  eventType: string,
  ctx: AuditCtx,
  opts: {
    entityType?: string;
    entityId?: Types.ObjectId | string;
    payload?: Record<string, unknown>;
  } = {}
): Promise<void> {
  await AuditLogModel.create({
    eventType,
    userId: ctx.userId ?? null,
    ipAddress: ctx.ipAddress ?? null,
    userAgent: ctx.userAgent ?? null,
    entityType: opts.entityType ?? null,
    entityId: opts.entityId ?? null,
    payload: opts.payload ?? {},
  });
}

export async function logUnmask(
  userId: Types.ObjectId | string,
  employeeId: Types.ObjectId | string,
  fieldName: SensitiveUnmaskField,
  ctx: { ipAddress?: string | null; userAgent?: string | null; reason?: string | null }
): Promise<void> {
  await UnmaskAuditModel.create({
    userId,
    employeeId,
    fieldName,
    ipAddress: ctx.ipAddress ?? null,
    userAgent: ctx.userAgent ?? null,
    reason: ctx.reason ?? null,
  });
}

/** Self-service Activity log entry for every unmask attempt (success or failure). */
export async function logUnmaskActivity(
  outcome: 'succeeded' | 'failed',
  userId: Types.ObjectId | string,
  employeeId: Types.ObjectId | string,
  field: SensitiveUnmaskField,
  ctx: {
    ipAddress?: string | null;
    userAgent?: string | null;
    reason?: string | null;
    empCode?: string | null;
    empName?: string | null;
    failureReason?: 'password_failed' | 'forbidden';
  }
): Promise<void> {
  const eventType = outcome === 'succeeded' ? 'unmask_succeeded' : 'unmask_failed';
  await audit(eventType, { userId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent }, {
    entityType: 'employee',
    entityId: employeeId,
    payload: {
      field,
      fieldLabel: SENSITIVE_UNMASK_FIELD_LABELS[field],
      empCode: ctx.empCode ?? null,
      empName: ctx.empName ?? null,
      reason: ctx.reason ?? null,
      ...(outcome === 'failed' && ctx.failureReason ? { failureReason: ctx.failureReason } : {}),
    },
  });
}
