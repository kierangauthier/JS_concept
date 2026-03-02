import { http } from './http';
import { WorkshopItem } from '@/services/mockDataExtended';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateWorkshopItemPayload {
  title: string;
  description?: string;
  jobId: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignedTo?: string;
}

export const workshopApi = {
  list: (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<WorkshopItem>> => {
    const qs = new URLSearchParams();
    qs.set('page', String(params?.page ?? 1));
    qs.set('limit', String(Math.min(params?.limit ?? 100, 100)));
    return http.get<PaginatedResponse<WorkshopItem>>(`/workshop-items?${qs}`);
  },

  get: (id: string): Promise<WorkshopItem> =>
    http.get(`/workshop-items/${id}`),

  create: (data: CreateWorkshopItemPayload): Promise<WorkshopItem> =>
    http.post<WorkshopItem>('/workshop-items', data),

  nextStep: (id: string): Promise<WorkshopItem> =>
    http.post<WorkshopItem>(`/workshop-items/${id}/next-step`),
};
