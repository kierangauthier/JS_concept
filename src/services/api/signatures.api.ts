import { http } from './http';

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
    http.post<SignatureResult>('/signatures', data),

  getByJob: (jobId: string): Promise<SignatureView[]> =>
    http.get<SignatureView[]>(`/signatures?jobId=${encodeURIComponent(jobId)}`),
};
