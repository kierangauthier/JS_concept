import { http } from './http';
import { Quote } from '@/types';
import { QuoteLine } from '@/services/mockDataExtended';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface QuoteDetail extends Quote {
  lines: QuoteLine[];
}

export interface CreateQuotePayload {
  clientId: string;
  subject: string;
  validUntil: string;
  lines: {
    designation: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    costPrice?: number;
  }[];
}

export interface UpdateQuotePayload extends Partial<Omit<CreateQuotePayload, 'lines'>> {
  status?: Quote['status'];
  lines?: CreateQuotePayload['lines'];
}

export const quotesApi = {
  list: (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Quote>> => {
    const qs = new URLSearchParams();
    qs.set('page', String(params?.page ?? 1));
    qs.set('limit', String(Math.min(params?.limit ?? 100, 100)));
    return http.get<PaginatedResponse<Quote>>(`/quotes?${qs}`);
  },

  get: (id: string): Promise<QuoteDetail> => http.get<QuoteDetail>(`/quotes/${id}`),

  create: (data: CreateQuotePayload): Promise<Quote> =>
    http.post<Quote>('/quotes', data),

  update: (id: string, data: UpdateQuotePayload): Promise<Quote> =>
    http.patch<Quote>(`/quotes/${id}`, data),

  updateStatus: (id: string, status: Quote['status']): Promise<Quote> =>
    http.patch<Quote>(`/quotes/${id}`, { status }),

  duplicate: (id: string): Promise<Quote> =>
    http.post<Quote>(`/quotes/${id}/duplicate`),

  convertToJob: (id: string, jobAddress?: string): Promise<{ id: string; reference: string; title: string; status: string; company: string; clientName: string }> =>
    http.post(`/quotes/${id}/convert-to-job`, { jobAddress }),

  convertFull: (id: string, options: { createWorkshop?: boolean; createPurchases?: boolean; jobAddress?: string }): Promise<{
    job: { id: string; reference: string; title: string };
    workshopItems: Array<{ id: string; reference: string; description: string }>;
    purchases: Array<{ id: string; reference: string; amount: number }>;
  }> => http.post(`/quotes/${id}/convert-full`, options),

  downloadPdf: async (quoteId: string): Promise<void> => {
    const tokens = JSON.parse(localStorage.getItem('cm_tokens') ?? '{}');
    const res = await fetch(`/api/quotes/${quoteId}/pdf`, {
      headers: {
        ...(tokens.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
    });
    if (!res.ok) throw new Error('Erreur lors du téléchargement du PDF');
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? `devis-${quoteId}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /** Fetch the PDF as a blob URL for in-browser preview. Caller must revoke the URL. */
  previewPdf: async (quoteId: string): Promise<string> => {
    const tokens = JSON.parse(localStorage.getItem('cm_tokens') ?? '{}');
    const res = await fetch(`/api/quotes/${quoteId}/pdf`, {
      headers: {
        ...(tokens.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
    });
    if (!res.ok) throw new Error('Erreur lors de la génération du PDF');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
