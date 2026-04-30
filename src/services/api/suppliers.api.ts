import { http } from './http';
import { Company } from '@/types';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  company: Company;
}

export interface CreateSupplierPayload {
  name: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
}

export interface UpdateSupplierPayload extends Partial<CreateSupplierPayload> {}

// Backend route is /api/vendors (legacy naming).
const BASE = '/vendors';

export const suppliersApi = {
  list: (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Supplier>> => {
    const qs = new URLSearchParams();
    qs.set('page', String(params?.page ?? 1));
    qs.set('limit', String(Math.min(params?.limit ?? 100, 100)));
    return http.get<PaginatedResponse<Supplier>>(`${BASE}?${qs}`);
  },

  get: (id: string): Promise<Supplier> => http.get<Supplier>(`${BASE}/${id}`),

  create: (data: CreateSupplierPayload): Promise<Supplier> =>
    http.post<Supplier>(BASE, data),

  update: (id: string, data: UpdateSupplierPayload): Promise<Supplier> =>
    http.patch<Supplier>(`${BASE}/${id}`, data),
};
