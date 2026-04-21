import { http } from './http';
import { TimeEntry } from '@/types';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTimeEntryPayload {
  jobId: string;
  date: string;
  hours: number;
  description: string;
}

export interface UpdateTimeEntryPayload {
  date?: string;
  hours?: number;
  description?: string;
}

export const timeEntriesApi = {
  list: (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<TimeEntry>> => {
    const qs = new URLSearchParams();
    qs.set('page', String(params?.page ?? 1));
    qs.set('limit', String(Math.min(params?.limit ?? 100, 100)));
    return http.get<PaginatedResponse<TimeEntry>>(`/time-entries?${qs}`);
  },

  create: (data: CreateTimeEntryPayload): Promise<TimeEntry> =>
    http.post<TimeEntry>('/time-entries', data),

  update: (id: string, data: UpdateTimeEntryPayload): Promise<TimeEntry> =>
    http.patch<TimeEntry>(`/time-entries/${id}`, data),

  submit: (ids: string[]): Promise<{ submitted: number }> =>
    http.post('/time-entries/submit', { ids }),

  approve: (id: string): Promise<TimeEntry> =>
    http.post<TimeEntry>(`/time-entries/${id}/approve`),

  approveBatch: (ids: string[]): Promise<{ approved: number }> =>
    http.post('/time-entries/approve-batch', { ids }),

  reject: (id: string, reason?: string): Promise<TimeEntry> =>
    http.post<TimeEntry>(`/time-entries/${id}/reject`, reason ? { reason } : undefined),

  remove: (id: string): Promise<void> =>
    http.delete<void>(`/time-entries/${id}`),
};
