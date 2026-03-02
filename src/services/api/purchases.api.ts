import { http } from './http';
import { Purchase } from '@/types';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatePurchasePayload {
  supplierId: string;
  jobId?: string;
  amount: number;
  orderedAt: string;
}

export const purchasesApi = {
  list: (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Purchase>> => {
    const qs = new URLSearchParams();
    qs.set('page', String(params?.page ?? 1));
    qs.set('limit', String(Math.min(params?.limit ?? 100, 100)));
    return http.get<PaginatedResponse<Purchase>>(`/purchase-orders?${qs}`);
  },

  get: (id: string): Promise<Purchase & { lines: any[] }> =>
    http.get(`/purchase-orders/${id}`),

  create: (data: CreatePurchasePayload): Promise<Purchase> =>
    http.post<Purchase>('/purchase-orders', data),

  markOrdered: (id: string): Promise<Purchase> =>
    http.post<Purchase>(`/purchase-orders/${id}/mark-ordered`),

  markReceived: (id: string): Promise<Purchase> =>
    http.post<Purchase>(`/purchase-orders/${id}/mark-received`),
};
