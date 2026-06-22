import type {
  AdminOverviewAnalyticsPayload,
  AdminOverviewChartsPayload,
  AdminOverviewKpiConfig,
  AdminOverviewStats,
  AdminOverviewTableConfig,
  AdminOverviewTableKind,
  AdminOverviewWidgetsConfig,
  DashboardAttendanceListResponse,
  DashboardAttendanceQuery,
} from '@mams/types';
import { parseContentDispositionFilename } from '@mams/types';
import { api } from './client';
import { useAuth } from '../store/auth';
import { apiBasePath } from './apiBase';

const BASE = apiBasePath();

export interface SystemHealthResponse {
  api: string;
  dbConnected: boolean;
  dbState: number;
  version: string;
  timezone: string;
  devices: { total: number; online: number; offline: number };
  ts: string;
}

import type { FeatureFlagId, FeatureFlagsPatchBody, FeatureFlagsResponse } from '@mams/types';

function buildParams(q: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  return params.toString();
}

export type AdminOverviewTableListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export const adminOverviewApi = {
  stats: () => api.get<AdminOverviewStats>('/admin/overview/stats'),
  analytics: (date?: string) =>
    api.get<AdminOverviewAnalyticsPayload>(
      `/admin/overview/analytics${date ? `?date=${encodeURIComponent(date)}` : ''}`
    ),
  charts: (params?: { date?: string; barMetric?: string; donutMetric?: string }) =>
    api.get<AdminOverviewChartsPayload>(
      `/admin/overview/charts${params ? `?${buildParams(params)}` : ''}`
    ),
  getWidgets: () => api.get<AdminOverviewWidgetsConfig>('/admin/overview/widgets'),
  saveWidgets: (config: AdminOverviewWidgetsConfig) =>
    api.put<AdminOverviewWidgetsConfig>('/admin/overview/widgets', config),
  getKpi: () => api.get<AdminOverviewKpiConfig>('/admin/overview/kpi'),
  saveKpi: (config: AdminOverviewKpiConfig) =>
    api.put<AdminOverviewKpiConfig>('/admin/overview/kpi', config),
  getTableConfig: () => api.get<AdminOverviewTableConfig>('/admin/overview/table-config'),
  saveTableConfig: (config: AdminOverviewTableConfig) =>
    api.put<AdminOverviewTableConfig>('/admin/overview/table-config', config),
  attendance: (q: DashboardAttendanceQuery) =>
    api.get<DashboardAttendanceListResponse>(`/admin/overview/attendance?${buildParams(q)}`),
  employees: (q: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    department?: string;
  }) =>
    api.get<AdminOverviewTableListResponse<Record<string, unknown>>>(
      `/admin/overview/employees?${buildParams(q)}`
    ),
  users: (q: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    active?: boolean;
  }) => {
    const params: Record<string, string | number | undefined> = {
      page: q.page,
      pageSize: q.pageSize,
      search: q.search,
      role: q.role,
    };
    if (q.active !== undefined) params.active = q.active ? 'true' : 'false';
    return api.get<AdminOverviewTableListResponse<Record<string, unknown>>>(
      `/admin/overview/users?${buildParams(params)}`
    );
  },
  audit: (q: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    eventType?: string;
  }) =>
    api.get<AdminOverviewTableListResponse<Record<string, unknown>>>(
      `/admin/overview/audit?${buildParams(q)}`
    ),
  devices: (q: {
    page?: number;
    pageSize?: number;
    search?: string;
    location?: string;
    online?: boolean;
  }) => {
    const params: Record<string, string | number | undefined> = {
      page: q.page,
      pageSize: q.pageSize,
      search: q.search,
      location: q.location,
    };
    if (q.online !== undefined) params.online = q.online ? 'true' : 'false';
    return api.get<AdminOverviewTableListResponse<Record<string, unknown>>>(
      `/admin/overview/devices?${buildParams(params)}`
    );
  },
  downloadTableXlsx: async (
    kind: AdminOverviewTableKind,
    q: Record<string, string | undefined>
  ) => {
    const token = useAuth.getState().accessToken;
    const res = await fetch(`${BASE}/admin/overview/${kind}.xlsx?${buildParams(q)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error((payload as { message?: string }).message ?? `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      parseContentDispositionFilename(res.headers.get('Content-Disposition')) ?? `${kind}-export.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const adminApi = {
  health: () => api.get<SystemHealthResponse>('/admin/health'),
  getFeatureFlags: () => api.get<FeatureFlagsResponse>('/admin/feature-flags'),
  patchFeatureFlags: (body: FeatureFlagsPatchBody) =>
    api.patch<FeatureFlagsResponse>('/admin/feature-flags', body),
  ...adminOverviewApi,
};
