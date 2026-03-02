import { http } from './http';

export interface HrDocument {
  id: string;
  userId: string;
  type: string;
  label: string;
  mimeType: string;
  sizeBytes: number;
  purpose: string;
  expiresAt: string | null;
  retentionUntil: string | null;
  createdAt: string;
}

export interface UserActivity {
  planned: Array<{
    date: string;
    startHour: number;
    endHour: number;
    jobRef: string;
    jobTitle: string;
    jobAddress: string;
    teamName: string;
  }>;
  actual: Array<{
    date: string;
    hours: number;
    description: string;
    status: string;
    jobRef: string;
    jobTitle: string;
  }>;
}

export const hrApi = {
  presignUpload: (data: { userId: string; type: string; filename: string; contentType: string }): Promise<{ uploadUrl: string; storageKey: string }> =>
    http.post('/hr/docs/presign', data),

  createDoc: (data: {
    userId: string;
    type: string;
    label: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    purpose: string;
    expiresAt?: string;
    retentionUntil?: string;
  }): Promise<HrDocument> =>
    http.post('/hr/docs', data),

  listDocs: (userId: string): Promise<HrDocument[]> =>
    http.get<HrDocument[]>(`/hr/users/${userId}/docs`),

  downloadDoc: (docId: string): Promise<{ downloadUrl: string }> =>
    http.get(`/hr/docs/${docId}/download`),

  deleteDoc: (docId: string): Promise<void> =>
    http.delete<void>(`/hr/docs/${docId}`),

  getUserActivity: (userId: string, from: string, to: string): Promise<UserActivity> =>
    http.get<UserActivity>(`/hr/users/${userId}/activity?from=${from}&to=${to}`),

  getCertificationMatrix: (): Promise<{
    types: string[];
    matrix: Array<{
      userId: string;
      userName: string;
      role: string;
      certifications: Record<string, 'ok' | 'expired' | 'missing'>;
    }>;
  }> => http.get('/hr/certification-matrix'),
};
