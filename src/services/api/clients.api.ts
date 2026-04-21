import { http } from './http';
import { Client } from '@/types';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateClientPayload {
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  type: 'public' | 'private';
}

export interface UpdateClientPayload extends Partial<CreateClientPayload> {}

export const clientsApi = {
  list: (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Client>> => {
    const qs = new URLSearchParams();
    qs.set('page', String(params?.page ?? 1));
    qs.set('limit', String(Math.min(params?.limit ?? 100, 100)));
    return http.get<PaginatedResponse<Client>>(`/clients?${qs}`);
  },

  get: (id: string): Promise<Client> => http.get<Client>(`/clients/${id}`),

  create: (data: CreateClientPayload): Promise<Client> =>
    http.post<Client>('/clients', data),

  update: (id: string, data: UpdateClientPayload): Promise<Client> =>
    http.patch<Client>(`/clients/${id}`, data),

  /** Soft-deletes a client (sets deletedAt). The client is hidden from list queries. */
  archive: (id: string): Promise<{ deleted: boolean }> =>
    http.delete<{ deleted: boolean }>(`/clients/${id}`),
};
