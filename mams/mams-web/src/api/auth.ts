import type { ChangePasswordRequest, LoginRequest, LoginResponse, UserPublic } from '@mams/types';
import { api } from './client';

export const authApi = {
  login: (body: LoginRequest) => api.post<LoginResponse>('/auth/login', body),
  refresh: (refreshToken: string) => api.post<LoginResponse>('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) => api.post<void>('/auth/logout', { refreshToken }),
  changePassword: (body: ChangePasswordRequest) =>
    api.post<{ user: UserPublic }>('/auth/change-password', body),
  me: () => api.get<{ user: UserPublic }>('/auth/me'),
};
