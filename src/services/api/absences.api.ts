import { http } from './http';

export interface AbsenceType {
  id: string;
  label: string;
  companyId: string;
}

export interface Absence {
  id: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  rejectionReason?: string | null;
  typeId: string;
  typeLabel: string;
  userId: string;
  userName: string;
  company: string;
  createdAt: string;
}

export interface CreateAbsencePayload {
  startDate: string;
  endDate: string;
  typeId: string;
  reason?: string;
}

export const absencesApi = {
  getAll: (status?: string): Promise<Absence[]> =>
    http.get<Absence[]>(status ? `/absences?status=${encodeURIComponent(status)}` : '/absences'),

  create: (data: CreateAbsencePayload): Promise<Absence> =>
    http.post<Absence>('/absences', data),

  approve: (id: string): Promise<Absence> =>
    http.post<Absence>(`/absences/${id}/approve`),

  reject: (id: string, reason?: string): Promise<Absence> =>
    http.post<Absence>(`/absences/${id}/reject`, reason ? { reason } : undefined),

  remove: (id: string): Promise<void> =>
    http.delete<void>(`/absences/${id}`),

  getTypes: (): Promise<AbsenceType[]> =>
    http.get<AbsenceType[]>('/absences/types'),

  createType: (label: string): Promise<AbsenceType> =>
    http.post<AbsenceType>('/absences/types', { label }),
};
