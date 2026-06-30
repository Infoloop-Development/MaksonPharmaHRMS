import type {
  EmployeeCreateBody,
  EmployeeListQuery,
  EmployeeListResponse,
  EmployeeMasked,
  EmployeePatchBody,
  SensitiveUnmaskField,
  BulkMutationResult,
} from '@mams/types';
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
  update: (id: string, body: EmployeePatchBody) => api.patch<EmployeeMasked>(`/employees/${id}`, body),
  delete: (id: string) => api.delete<void>(`/employees/${id}`),
  bulkDelete: (ids: string[]) =>
    api.post<BulkMutationResult>('/employees/bulk-delete', { ids }),
  unmask: (
    id: string,
    field: SensitiveUnmaskField,
    body: { password: string; reason?: string }
  ) =>
    api.post<{ field: string; value: string; unmaskedAt: string }>(`/employees/${id}/unmask`, {
      field,
      password: body.password,
      reason: body.reason,
    }),
};
