import type { ChangePasswordRequest, LoginRequest, LoginResponse, UserPublic } from '@mams/types';
import { api } from './client';

export const authApi = {
  login: (body: LoginRequest) => api.post<LoginResponse>('/auth/login', body),
  logout: (refreshToken: string) => api.post<void>('/auth/logout', { refreshToken }),
  changePassword: (body: ChangePasswordRequest) =>
    api.post<{ user: UserPublic }>('/auth/change-password', body),
};
