import type { DeviceDoc } from '../../../models/Device.js';
import { logger } from '../../../utils/logger.js';
import { HanvonPullResponseSchema, parseHanvonPullRecords } from './adapter.js';
import { ingestCanonicalPunches } from '../../../services/attendanceIngestion.service.js';
import type { IngestionResult } from '../../types.js';

/**
 * Pull attendance logs from a Hanvon device HTTP API (SDK pull mode).
 * Expected endpoint: GET {pullBaseUrl}/api/attendance/logs?since={iso}
 * Response: { records: [{ userId, time, inOut?, verifyMode? }] }
 */
export async function pullHanvonDeviceLogs(
  device: DeviceDoc,
  sourceIp: string | null
): Promise<IngestionResult & { ok: boolean; error?: string }> {
  const cfg = device.integrationConfig;
  const baseUrl = cfg?.pullBaseUrl;
  if (!baseUrl) {
    return { ok: false, error: 'pullBaseUrl not configured', inserted: 0, duplicates: 0, orphans: [], affectedPairs: 0 };
  }

  const since = device.lastSyncAt?.toISOString() ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const url = new URL('/api/attendance/logs', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  url.searchParams.set('since', since);
  url.searchParams.set('deviceSn', device.serialNumber);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (cfg?.apiKey) headers['X-Api-Key'] = cfg.apiKey;

  try {
    const res = await fetch(url.toString(), { method: 'GET', headers, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Hanvon pull HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const json: unknown = await res.json();
    const parsed = HanvonPullResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error('Invalid Hanvon pull response shape');
    }
    const events = parseHanvonPullRecords(parsed.data.records, device.serialNumber);
    const result = await ingestCanonicalPunches(device, events, sourceIp);
    device.lastSyncAt = new Date();
    device.lastSyncStatus = 'ok';
    device.lastSyncError = null;
    await device.save();
    return { ok: true, ...result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    device.lastSyncAt = new Date();
    device.lastSyncStatus = 'error';
    device.lastSyncError = message;
    await device.save();
    logger.error('hanvon_pull_failed', { deviceId: String(device._id), error: message });
    return { ok: false, error: message, inserted: 0, duplicates: 0, orphans: [], affectedPairs: 0 };
  }
}
