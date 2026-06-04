import { api } from './client';

export interface AttendanceListResponse {
  viewMode: 'real' | 'compliant';
  items: any[];
  total: number;
  page: number;
  pageSize: number;
}

export type RawPunchRow = {
  _id: string;
  employeeId: { _id: string; name: string; empCode: string; department: string };
  biometricId: string;
  punchType: 'IN' | 'OUT' | 'OTHER';
  rawTimestamp: string;
  rawDate: string;
};

export interface RawPunchResponse {
  items: RawPunchRow[];
}

export interface RawPunchListResponse extends RawPunchResponse {
  total: number;
  page: number;
  pageSize: number;
}

export type RawPunchListQuery = {
  search?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  punchType?: 'IN' | 'OUT' | 'OTHER';
  page?: number;
  pageSize?: number;
  limit?: number;
};

export const attendanceApi = {
  list: (q: { date?: string; startDate?: string; endDate?: string; employeeId?: string; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)));
    return api.get<AttendanceListResponse>(`/attendance?${params.toString()}`);
  },
  listRaw: (q: RawPunchListQuery = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)));
    return api.get<RawPunchListResponse>(`/attendance/raw?${params.toString()}`);
  },
  recentRaw: (limit = 50) => api.get<RawPunchResponse>(`/attendance/raw/recent?limit=${limit}`),
};
