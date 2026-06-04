import { z } from 'zod';
import { DeviceVendorSchema } from './device.js';

/** Normalized punch before persistence — all vendor adapters produce this shape. */
export const CanonicalPunchEventSchema = z.object({
  biometricId: z.string().min(1),
  /** IST wall-clock string: YYYY-MM-DD HH:mm:ss */
  timestampIst: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
  punchType: z.enum(['IN', 'OUT', 'OTHER']),
  verifyType: z.number().int().optional(),
  workCode: z.number().int().optional(),
  vendor: DeviceVendorSchema,
  rawProtocol: z.string(),
  parserVersion: z.string(),
  vendorPayload: z.record(z.unknown()),
  /** Stable dedupe key: vendor + deviceSn + biometricId + timestamp + punchType */
  idempotencyKey: z.string().min(1),
});
export type CanonicalPunchEvent = z.infer<typeof CanonicalPunchEventSchema>;
