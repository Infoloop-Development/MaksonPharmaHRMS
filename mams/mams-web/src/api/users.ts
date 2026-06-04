import { api } from './client';
import type { Permission, Role, UserPublic, UserUpdateBody } from '@mams/types';

export interface UserSummary {
  _id: string;
  email: string;
  name: string;
  role: Role;
  viewMode: 'real' | 'compliant';
  permissions: Permission[];
  isActive: boolean;
  mustChangePassword?: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserCreateResponse extends UserSummary {
  emailSent?: boolean;
  emailError?: string;
}

export type UserPatchResponse =
  | (UserSummary & Record<string, unknown>)
  | { user: UserPublic };

export const usersApi = {
  list: () => api.get<{ items: UserSummary[] }>('/users'),
  create: (body: { email: string; name: string; role: Role; password: string }) =>
    api.post<UserCreateResponse>('/users', body),
  patch: (id: string, body: UserUpdateBody) => api.patch<UserPatchResponse>(`/users/${id}`, body),
};
