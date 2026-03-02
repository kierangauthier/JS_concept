import { api } from './client';

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
    api.get('/absences', { params: status ? { status } : {} }).then(r => r.data),

  create: (data: CreateAbsencePayload): Promise<Absence> =>
    api.post('/absences', data).then(r => r.data),

  approve: (id: string): Promise<Absence> =>
    api.post(`/absences/${id}/approve`).then(r => r.data),

  reject: (id: string): Promise<Absence> =>
    api.post(`/absences/${id}/reject`).then(r => r.data),

  remove: (id: string): Promise<void> =>
    api.delete(`/absences/${id}`).then(r => r.data),

  getTypes: (): Promise<AbsenceType[]> =>
    api.get('/absences/types').then(r => r.data),

  createType: (label: string): Promise<AbsenceType> =>
    api.post('/absences/types', { label }).then(r => r.data),
};
