import { api } from './client';

export interface SignatureResult {
  id: string;
  uploadUrl: string;
  storageKey: string;
  signatoryName: string;
  interventionDate: string;
  createdAt: string;
}

export interface SignatureView {
  id: string;
  signatoryName: string;
  interventionDate: string;
  downloadUrl: string | null;
  createdAt: string;
}

export const signaturesApi = {
  create: (data: { jobId: string; interventionDate: string; signatoryName: string }): Promise<SignatureResult> =>
    api.post('/signatures', data).then(r => r.data),

  getByJob: (jobId: string): Promise<SignatureView[]> =>
    api.get('/signatures', { params: { jobId } }).then(r => r.data),
};
