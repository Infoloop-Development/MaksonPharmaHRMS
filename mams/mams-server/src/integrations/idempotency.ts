import { createHash } from 'node:crypto';
import type { DeviceVendor } from '@mams/types';

export function buildIdempotencyKey(parts: {
  vendor: DeviceVendor;
  deviceSerial: string;
  biometricId: string;
  timestampIst: string;
  punchType: string;
}): string {
  const raw = [parts.vendor, parts.deviceSerial, parts.biometricId, parts.timestampIst, parts.punchType].join('|');
  return createHash('sha256').update(raw).digest('hex').slice(0, 40);
}
