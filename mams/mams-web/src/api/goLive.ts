import { api } from './client';

export interface OrphanPunchRow {
  id: string;
  occurredAt: string;
  deviceId: string | null;
  deviceCode: string | null;
  deviceSerial: string | null;
  vendor: string | null;
  orphanIds: string[];
  sourceIp: string | null;
}

export interface GoLiveReadiness {
  daysWithoutPunch: number;
  totalActive: number;
  withRecentPunch: number;
  withoutRecentPunch: number;
  employeesWithoutPunch: Array<{
    id: string;
    empCode: string;
    name: string;
    biometricId: string;
    department: string;
    location: string;
    lastPunchAt: string | null;
  }>;
}

export const goLiveApi = {
  orphanPunches: (q: { page?: number; pageSize?: number; sinceDays?: number } = {}) => {
    const params = new URLSearchParams();
    if (q.page) params.set('page', String(q.page));
    if (q.pageSize) params.set('pageSize', String(q.pageSize));
    if (q.sinceDays) params.set('sinceDays', String(q.sinceDays));
    const qs = params.toString();
    return api.get<{ items: OrphanPunchRow[]; total: number; page: number; pageSize: number }>(
      `/go-live/orphan-punches${qs ? `?${qs}` : ''}`
    );
  },
  readiness: (daysWithoutPunch = 7) =>
    api.get<GoLiveReadiness>(`/go-live/readiness?daysWithoutPunch=${daysWithoutPunch}`),
};
