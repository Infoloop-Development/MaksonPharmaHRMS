import { Types } from 'mongoose';
import type { ActivityListQuery, UiActivityLogBody } from '@mams/types';
import { AuditLogModel } from '../models/AuditLog.js';
import { audit } from './audit.service.js';
import { ApiError } from '../middleware/error.js';
import { isUnmaskEnabled } from '../config/featureFlags.js';

const MAX_PAYLOAD_BYTES = 4096;

/** Event types hidden from self-service Activity (noise / security). */
const HIDDEN_SELF_SERVICE = new Set(['login_failed', 'welcome_email_failed']);

function hiddenEventTypes(): string[] {
  const hidden = [...HIDDEN_SELF_SERVICE];
  if (!isUnmaskEnabled()) {
    hidden.push('unmask_succeeded', 'unmask_failed');
  }
  return hidden;
}

export function assertUiPayloadSize(payload: Record<string, unknown> | undefined): void {
  if (!payload) return;
  const size = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  if (size > MAX_PAYLOAD_BYTES) {
    throw new ApiError(400, 'payload_too_large', 'Activity payload exceeds 4KB limit');
  }
}

export async function logUiActivity(
  ctx: { userId: string; ipAddress: string | null; userAgent: string | null },
  body: UiActivityLogBody
): Promise<void> {
  assertUiPayloadSize(body.payload as Record<string, unknown> | undefined);
  await audit(body.eventType, ctx, {
    payload: {
      page: body.page,
      action: body.action,
      ...(body.payload ?? {}),
    },
  });
}

export async function listMyActivity(userId: string, q: ActivityListQuery) {
  const uid = new Types.ObjectId(userId);
  const filter = {
    userId: uid,
    eventType: { $nin: hiddenEventTypes() },
    $or: [
      { eventType: { $ne: 'csv_import' } },
      { eventType: 'csv_import', 'payload.successCount': { $gt: 0 } },
    ],
  };

  const [total, rows] = await Promise.all([
    AuditLogModel.countDocuments(filter),
    AuditLogModel.find(filter)
      .sort({ occurredAt: -1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
  ]);

  const items = rows.map((r) => ({
    id: String(r._id),
    occurredAt: (r.occurredAt ?? r.createdAt).toISOString(),
    eventType: r.eventType,
    entityType: r.entityType ?? null,
    entityId: r.entityId ? String(r.entityId) : null,
    payload: (r.payload ?? {}) as Record<string, unknown>,
  }));

  return { items, total, page: q.page, pageSize: q.pageSize };
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/** Build audit diff for settings PATCH — only keys whose values actually changed. */
export function diffSettingsValues(
  doc: Record<string, unknown>,
  patch: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown>; changedFields: string[] } {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const prev = doc[key];
    if (valuesEqual(prev, value)) continue;
    before[key] = prev;
    after[key] = value;
    changedFields.push(key);
  }

  return { before, after, changedFields };
}

/** Map settings patch keys to Activity section labels. */
export function settingsSectionFromChangedFields(fields: string[]): string {
  const company = new Set([
    'companyName',
    'registeredAddress',
    'signatoryName',
    'signatoryDesignation',
    'weeklyOffDefault',
    'realShifts',
    'complianceShifts',
  ]);
  const compliance = new Set([
    'cin',
    'gstin',
    'pfRegistrationNumber',
    'esiRegistrationNumber',
    'factoryLicenceNumber',
  ]);
  const smartAnchor = new Set(['smartAnchorEnabled']);
  const confidentiality = new Set(['confidentialityNoticeEnabled', 'confidentialityNoticeText']);
  const exportNaming = new Set(['exportNaming']);
  const brandAssets = new Set(['companyLogo', 'favicon']);
  const timeDisplay = new Set(['timeFormat']);

  if (fields.some((f) => brandAssets.has(f))) return 'brand_assets';
  if (fields.some((f) => timeDisplay.has(f))) return 'time_display';
  if (fields.some((f) => company.has(f))) return 'company';
  if (fields.some((f) => compliance.has(f))) return 'compliance';
  if (fields.some((f) => smartAnchor.has(f))) return 'smart_anchor';
  if (fields.some((f) => confidentiality.has(f))) return 'confidentiality';
  if (fields.some((f) => exportNaming.has(f))) return 'export_naming';
  if (fields.some((f) => f === 'realShifts' || f === 'complianceShifts' || f === 'weeklyOffDefault')) {
    return 'shifts';
  }
  return 'settings';
}
