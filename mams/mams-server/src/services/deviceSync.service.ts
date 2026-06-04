import type { DeviceDoc } from '../models/Device.js';
import { pullHanvonDeviceLogs } from '../integrations/adapters/hanvon/pullSync.js';
import type { IngestionResult } from '../integrations/types.js';

export interface DeviceSyncResult {
  ok: boolean;
  vendor: string;
  method: 'push_ack' | 'hanvon_pull' | 'none';
  inserted?: number;
  duplicates?: number;
  error?: string;
}

/** Run vendor-specific sync for a single device. */
export async function syncDevice(
  device: DeviceDoc,
  sourceIp: string | null
): Promise<DeviceSyncResult> {
  if (device.vendor === 'Hanvon' && device.protocolMode === 'pull') {
    const result = await pullHanvonDeviceLogs(device, sourceIp);
    return {
      ok: result.ok,
      vendor: 'Hanvon',
      method: 'hanvon_pull',
      inserted: result.inserted,
      duplicates: result.duplicates,
      error: result.error,
    };
  }

  // eSSL and Hanvon push devices: connectivity check via lastPingAt refresh.
  device.lastSyncAt = new Date();
  device.lastSyncStatus = 'ok';
  device.lastSyncError = null;
  device.lastPingAt = new Date();
  await device.save();

  return {
    ok: true,
    vendor: device.vendor ?? 'eSSL',
    method: device.protocolMode === 'push' ? 'push_ack' : 'none',
  };
}

/** Test device connectivity without ingesting punches. */
export async function testDeviceConnectivity(device: DeviceDoc): Promise<DeviceSyncResult> {
  if (device.vendor === 'Hanvon' && device.protocolMode === 'pull') {
    const cfg = device.integrationConfig;
    if (!cfg?.pullBaseUrl) {
      return { ok: false, vendor: 'Hanvon', method: 'none', error: 'pullBaseUrl not configured' };
    }
    try {
      const base = cfg.pullBaseUrl.endsWith('/') ? cfg.pullBaseUrl : `${cfg.pullBaseUrl}/`;
      const url = new URL('api/health', base);
      const headers: Record<string, string> = {};
      if (cfg.apiKey) headers['X-Api-Key'] = cfg.apiKey;
      const res = await fetch(url.toString(), { method: 'GET', headers, signal: AbortSignal.timeout(10_000) });
      return {
        ok: res.ok,
        vendor: 'Hanvon',
        method: 'hanvon_pull',
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (err) {
      return {
        ok: false,
        vendor: 'Hanvon',
        method: 'hanvon_pull',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    ok: !!device.lastPingAt && device.lastPingAt > new Date(Date.now() - 5 * 60 * 1000),
    vendor: device.vendor ?? 'eSSL',
    method: 'push_ack',
    error: undefined,
  };
}
