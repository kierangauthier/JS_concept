import { http } from './http';
import type { Company } from '@/types';

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  company: Company;
  isActive: boolean;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role: string;
  companyId: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: string;
}

export const usersApi = {
  list: (): Promise<ApiUser[]> =>
    http.get<ApiUser[]>('/users'),

  create: (data: CreateUserPayload): Promise<ApiUser> =>
    http.post<ApiUser>('/users', data),

  update: (id: string, data: UpdateUserPayload): Promise<ApiUser> =>
    http.patch<ApiUser>(`/users/${id}`, data),

  deactivate: (id: string): Promise<{ deactivated: boolean }> =>
    http.delete<{ deactivated: boolean }>(`/users/${id}`),

  resetPassword: (id: string, password: string): Promise<{ reset: boolean }> =>
    http.patch<{ reset: boolean }>(`/users/${id}/reset-password`, { password }),
};
