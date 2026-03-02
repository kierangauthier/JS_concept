import { http } from './http';
import { Job } from '@/types';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateJobPayload {
  title: string;
  address: string;
  startDate: string;
  endDate?: string;
  quoteId?: string;
  clientId?: string;
  hourlyRate?: number;
  estimatedHours?: number;
}

export interface JobPhoto {
  id: string;
  jobId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface UpdateJobPayload extends Partial<CreateJobPayload> {
  status?: Job['status'];
  progress?: number;
  assignedUserIds?: string[];
  hourlyRate?: number;
  estimatedHours?: number;
}

export const jobsApi = {
  list: (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Job>> => {
    const qs = new URLSearchParams();
    qs.set('page', String(params?.page ?? 1));
    qs.set('limit', String(Math.min(params?.limit ?? 100, 100)));
    return http.get<PaginatedResponse<Job>>(`/jobs?${qs}`);
  },

  get: (id: string): Promise<Job & { timeEntries: any[] }> =>
    http.get(`/jobs/${id}`),

  getTimeline: (id: string): Promise<any[]> =>
    http.get(`/jobs/${id}/timeline`),

  create: (data: CreateJobPayload): Promise<Job> =>
    http.post<Job>('/jobs', data),

  update: (id: string, data: UpdateJobPayload): Promise<Job> =>
    http.patch<Job>(`/jobs/${id}`, data),

  updateStatus: (id: string, status: Job['status']): Promise<Job> =>
    http.patch<Job>(`/jobs/${id}`, { status }),

  getMargin: (id: string): Promise<{
    revenueHT: number; costHours: number; costPurchases: number;
    totalCost: number; margin: number; marginPercent: number;
    totalHours: number; hourlyRate: number; estimatedHours: number | null;
  }> => http.get(`/jobs/${id}/margin`),

  getDashboardMargins: (): Promise<{
    avgMargin: number;
    worst: { id: string; reference: string; title: string; revenueHT: number; totalCost: number; margin: number; marginPercent: number }[];
    best: { id: string; reference: string; title: string; revenueHT: number; totalCost: number; margin: number; marginPercent: number }[];
    lowMarginCount: number;
    lowMarginJobs: { id: string; reference: string; title: string; marginPercent: number }[];
  }> => http.get('/jobs/margins/dashboard'),

  // ─── Photos ──────────────────────────────────────────────────────────────

  presignPhoto: (jobId: string, data: { filename: string; contentType: string }): Promise<{ uploadUrl: string; storageKey: string }> =>
    http.post(`/jobs/${jobId}/photos/presign`, data),

  createPhoto: (jobId: string, data: { storageKey: string; filename: string; contentType: string; sizeBytes: number }): Promise<JobPhoto> =>
    http.post(`/jobs/${jobId}/photos`, data),

  listPhotos: (jobId: string): Promise<JobPhoto[]> =>
    http.get(`/jobs/${jobId}/photos`),

  getPhotoUrl: (jobId: string, photoId: string): Promise<{ downloadUrl: string }> =>
    http.get(`/jobs/${jobId}/photos/${photoId}/url`),

  deletePhoto: (jobId: string, photoId: string): Promise<{ deleted: boolean }> =>
    http.delete(`/jobs/${jobId}/photos/${photoId}`),
};
