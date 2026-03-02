import { http } from './http';
import { Company } from '@/types';

export interface PlanningSlot {
  id: string;
  date: string;
  userId: string;
  userName: string;
  jobId: string;
  jobRef: string;
  jobTitle: string;
  company: Company;
  note: string | null;
}

export interface CreateSlotPayload {
  userId: string;
  jobId: string;
  date: string;
  note?: string;
}

export const planningApi = {
  list: (startDate: string, endDate: string): Promise<PlanningSlot[]> =>
    http.get<PlanningSlot[]>(`/planning-slots?startDate=${startDate}&endDate=${endDate}`),

  create: (data: CreateSlotPayload): Promise<PlanningSlot> =>
    http.post<PlanningSlot>('/planning-slots', data),

  bulkCreate: (slots: CreateSlotPayload[]): Promise<PlanningSlot[]> =>
    http.post<PlanningSlot[]>('/planning-slots/bulk', { slots }),

  delete: (id: string): Promise<void> =>
    http.delete<void>(`/planning-slots/${id}`),
};
