import { z } from 'zod';

export const DeviceVendorSchema = z.enum(['eSSL', 'Hanvon']);
export type DeviceVendor = z.infer<typeof DeviceVendorSchema>;

export const DeviceProtocolModeSchema = z.enum(['push', 'pull']);
export type DeviceProtocolMode = z.infer<typeof DeviceProtocolModeSchema>;

export const DeviceSyncStatusSchema = z.enum(['ok', 'error', 'pending']);
export type DeviceSyncStatus = z.infer<typeof DeviceSyncStatusSchema>;

/** Per-vendor integration settings stored on the device document. */
export const DeviceIntegrationConfigSchema = z.object({
  /** Hanvon push webhook shared secret (validated on ingest). */
  pushToken: z.string().min(8).optional(),
  /** Hanvon pull API base URL, e.g. http://192.168.0.50:8080 */
  pullBaseUrl: z.string().url().optional(),
  /** Hanvon API key / device password for pull mode. */
  apiKey: z.string().optional(),
  pullIntervalMinutes: z.coerce.number().int().min(1).max(1440).optional(),
});
export type DeviceIntegrationConfig = z.infer<typeof DeviceIntegrationConfigSchema>;

export const DevicePublicSchema = z.object({
  id: z.string(),
  deviceCode: z.string(),
  serialNumber: z.string(),
  vendor: DeviceVendorSchema,
  protocolMode: DeviceProtocolModeSchema,
  model: z.string(),
  name: z.string(),
  department: z.string().nullable(),
  location: z.string(),
  ipAddress: z.string().nullable(),
  lastPingAt: z.string().datetime().nullable(),
  lastSyncAt: z.string().datetime().nullable(),
  lastSyncStatus: DeviceSyncStatusSchema.nullable(),
  lastSyncError: z.string().nullable(),
  isOnline: z.boolean(),
  totalEmployeesAssigned: z.number(),
  recentPunchCount: z.number(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
});
export type DevicePublic = z.infer<typeof DevicePublicSchema>;
