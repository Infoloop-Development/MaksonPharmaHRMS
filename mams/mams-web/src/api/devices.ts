import { api } from './client';

export type DeviceVendor = 'eSSL' | 'Hanvon';
export type DeviceProtocolMode = 'push' | 'pull';

export interface DeviceIntegrationConfig {
  pushToken?: string;
  pullBaseUrl?: string;
  apiKey?: string;
  pullIntervalMinutes?: number;
}

export interface Device {
  _id: string;
  deviceCode: string;
  serialNumber: string;
  vendor: DeviceVendor;
  protocolMode: DeviceProtocolMode;
  model: string;
  name: string;
  department: string | null;
  location: string;
  ipAddress: string | null;
  lastPingAt: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: 'ok' | 'error' | 'pending' | null;
  lastSyncError: string | null;
  isOnline: boolean;
  totalEmployeesAssigned: number;
  recentPunchCount: number;
  isActive: boolean;
  notes: string | null;
  integrationConfig?: DeviceIntegrationConfig;
}

export interface DeviceCreate {
  deviceCode: string;
  serialNumber: string;
  vendor?: DeviceVendor;
  protocolMode?: DeviceProtocolMode;
  integrationConfig?: DeviceIntegrationConfig;
  model: string;
  name: string;
  department: string;
  location: string;
  ipAddress?: string;
  notes?: string;
}

export const devicesApi = {
  list: () => api.get<{ items: Device[]; total: number }>('/devices'),
  create: (body: DeviceCreate) => api.post<Device>('/devices', body),
  update: (id: string, body: Partial<DeviceCreate>) => api.patch<Device>(`/devices/${id}`, body),
  sync: (id: string) => api.post<{ ok: boolean; method?: string; inserted?: number; device?: Device }>(`/devices/${id}/sync`),
  syncAll: () => api.post<{ ok: boolean; count: number; results?: unknown[] }>('/devices/sync-all'),
  test: (id: string) => api.post<{ ok: boolean; vendor: string; method: string; error?: string }>(`/devices/${id}/test`),
};
