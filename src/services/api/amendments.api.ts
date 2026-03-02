import { api } from './client';

export interface AmendmentLine {
  id: string;
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  sortOrder: number;
}

export interface Amendment {
  id: string;
  reference: string;
  subject: string;
  amount: number;
  status: string;
  quoteId: string;
  quoteRef: string;
  lines: AmendmentLine[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAmendmentPayload {
  subject: string;
  lines?: { designation: string; unit?: string; quantity: number; unitPrice: number; costPrice?: number }[];
}

export const amendmentsApi = {
  getByQuote: (quoteId: string): Promise<Amendment[]> =>
    api.get(`/quotes/${quoteId}/amendments`).then(r => r.data),

  getOne: (id: string): Promise<Amendment> =>
    api.get(`/amendments/${id}`).then(r => r.data),

  create: (quoteId: string, data: CreateAmendmentPayload): Promise<Amendment> =>
    api.post(`/quotes/${quoteId}/amendments`, data).then(r => r.data),

  update: (id: string, data: Partial<CreateAmendmentPayload>): Promise<Amendment> =>
    api.patch(`/amendments/${id}`, data).then(r => r.data),

  updateStatus: (id: string, status: string): Promise<Amendment> =>
    api.patch(`/amendments/${id}/status`, { status }).then(r => r.data),

  remove: (id: string): Promise<void> =>
    api.delete(`/amendments/${id}`).then(r => r.data),
};
