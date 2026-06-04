import type { Types } from 'mongoose';
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
  fieldName: 'pan' | 'aadhaar' | 'bankAccountNumber' | 'pfNumber' | 'esiNumber',
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
