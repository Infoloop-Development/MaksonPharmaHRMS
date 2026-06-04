import type { EmployeeCreateBody, EmployeeListQuery, EmployeeListResponse, EmployeeMasked } from '@mams/types';
import { api } from './client';

export const employeesApi = {
  list: (q: Partial<EmployeeListQuery>) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)));
    return api.get<EmployeeListResponse>(`/employees?${params.toString()}`);
  },
  getOne: (id: string) => api.get<EmployeeMasked>(`/employees/${id}`),
  previewNextCode: () => api.get<{ nextEmpCode: string }>('/employees/next-code'),
  create: (body: EmployeeCreateBody) => api.post<EmployeeMasked>('/employees', body),
  unmask: (id: string, field: 'pan' | 'aadhaar' | 'bankAccountNumber' | 'pfNumber' | 'esiNumber', reason?: string) =>
    api.post<{ field: string; value: string; unmaskedAt: string }>(`/employees/${id}/unmask`, { field, reason }),
};
