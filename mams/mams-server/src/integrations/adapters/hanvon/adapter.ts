import { z } from 'zod';
import type { CanonicalPunchEvent } from '@mams/types';
import type { AdapterParseContext, DeviceAdapter } from '../../types.js';
import { buildIdempotencyKey } from '../../idempotency.js';

export const HANVON_PARSER_VERSION = '1.0.0';
export const HANVON_RAW_PROTOCOL = 'Hanvon/SDK-Push-v1';

/** Hanvon SDK push payload (JSON). Field names align with common FaceID HTTP APIs. */
export const HanvonPushBodySchema = z.object({
  deviceSn: z.string().optional(),
  records: z.array(
    z.object({
      userId: z.union([z.string(), z.number()]).transform(String),
      time: z.string().min(1),
      inOut: z.coerce.number().optional(),
      verifyMode: z.coerce.number().optional(),
      workCode: z.coerce.number().optional(),
    })
  ).min(1),
});
export type HanvonPushBody = z.infer<typeof HanvonPushBodySchema>;

/** Hanvon pull API attendance log row. */
export const HanvonPullRecordSchema = z.object({
  userId: z.union([z.string(), z.number()]).transform(String),
  time: z.string().min(1),
  inOut: z.coerce.number().optional(),
  verifyMode: z.coerce.number().optional(),
});
export type HanvonPullRecord = z.infer<typeof HanvonPullRecordSchema>;

export const HanvonPullResponseSchema = z.object({
  records: z.array(HanvonPullRecordSchema).default([]),
});
export type HanvonPullResponse = z.infer<typeof HanvonPullResponseSchema>;

function normalizeHanvonTime(time: string): string | null {
  const trimmed = time.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.replace('T', ' ').slice(0, 19);
  }
  return null;
}

function recordToCanonical(
  record: { userId: string; time: string; inOut?: number; verifyMode?: number; workCode?: number },
  deviceSerial: string,
  rawProtocol: string
): CanonicalPunchEvent | null {
  const timestampIst = normalizeHanvonTime(record.time);
  if (!timestampIst) return null;
  const punchType =
    record.inOut === 0 ? 'IN' : record.inOut === 1 ? 'OUT' : 'OTHER';
  return {
    biometricId: record.userId,
    timestampIst,
    punchType,
    verifyType: record.verifyMode,
    workCode: record.workCode,
    vendor: 'Hanvon',
    rawProtocol,
    parserVersion: HANVON_PARSER_VERSION,
    vendorPayload: { ...record },
    idempotencyKey: buildIdempotencyKey({
      vendor: 'Hanvon',
      deviceSerial,
      biometricId: record.userId,
      timestampIst,
      punchType,
    }),
  };
}

export const hanvonAdapter: DeviceAdapter = {
  vendor: 'Hanvon',
  parserVersion: HANVON_PARSER_VERSION,
  rawProtocol: HANVON_RAW_PROTOCOL,
  parsePunches(input: unknown, ctx: AdapterParseContext): CanonicalPunchEvent[] {
    const parsed = HanvonPushBodySchema.safeParse(input);
    if (!parsed.success) return [];
    const out: CanonicalPunchEvent[] = [];
    for (const rec of parsed.data.records) {
      const canonical = recordToCanonical(rec, ctx.device.serialNumber, HANVON_RAW_PROTOCOL);
      if (canonical) out.push(canonical);
    }
    return out;
  },
};

export function parseHanvonPullRecords(
  records: HanvonPullRecord[],
  deviceSerial: string
): CanonicalPunchEvent[] {
  const rawProtocol = 'Hanvon/SDK-Pull-v1';
  const out: CanonicalPunchEvent[] = [];
  for (const rec of records) {
    const canonical = recordToCanonical(rec, deviceSerial, rawProtocol);
    if (canonical) out.push(canonical);
  }
  return out;
}
