import { http } from './http';

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
    http.get<Amendment[]>(`/quotes/${quoteId}/amendments`),

  getOne: (id: string): Promise<Amendment> =>
    http.get<Amendment>(`/amendments/${id}`),

  create: (quoteId: string, data: CreateAmendmentPayload): Promise<Amendment> =>
    http.post<Amendment>(`/quotes/${quoteId}/amendments`, data),

  update: (id: string, data: Partial<CreateAmendmentPayload>): Promise<Amendment> =>
    http.patch<Amendment>(`/amendments/${id}`, data),

  updateStatus: (id: string, status: string): Promise<Amendment> =>
    http.patch<Amendment>(`/amendments/${id}/status`, { status }),

  remove: (id: string): Promise<void> =>
    http.delete<void>(`/amendments/${id}`),
};
