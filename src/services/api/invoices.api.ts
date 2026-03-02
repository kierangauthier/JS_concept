import { http } from './http';
import { Invoice } from '@/types';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateInvoicePayload {
  clientId?: string;
  jobId?: string;
  amount: number;
  issuedAt: string;
  dueDate: string;
}

export interface CreateSituationPayload {
  percentage: number;
  description?: string;
  date?: string;
}

export interface InvoiceSituation {
  id: string;
  invoiceId: string;
  number: number;
  label: string;
  percentage: number;
  amount: number;
  cumulativeAmount: number;
  description: string | null;
  status: 'draft' | 'validated' | 'sent' | 'paid';
  date: string;
  createdAt: string;
}

export const invoicesApi = {
  list: (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Invoice>> => {
    const qs = new URLSearchParams();
    qs.set('page', String(params?.page ?? 1));
    qs.set('limit', String(Math.min(params?.limit ?? 100, 100)));
    return http.get<PaginatedResponse<Invoice>>(`/invoices?${qs}`);
  },

  get: (id: string): Promise<Invoice & { situations: InvoiceSituation[] }> =>
    http.get(`/invoices/${id}`),

  create: (data: CreateInvoicePayload): Promise<Invoice> =>
    http.post<Invoice>('/invoices', data),

  updateStatus: (id: string, status: string): Promise<Invoice> =>
    http.patch<Invoice>(`/invoices/${id}`, { status }),

  // ─── Situations ──────────────────────────────────────────────────────────

  getSituations: (invoiceId: string): Promise<InvoiceSituation[]> =>
    http.get<InvoiceSituation[]>(`/invoices/${invoiceId}/situations`),

  createSituation: (invoiceId: string, data: CreateSituationPayload): Promise<InvoiceSituation> =>
    http.post<InvoiceSituation>(`/invoices/${invoiceId}/situations`, data),

  validateSituation: (situationId: string): Promise<InvoiceSituation> =>
    http.patch<InvoiceSituation>(`/invoices/situations/${situationId}/validate`, {}),

  // ─── PDF & CSV Export ─────────────────────────────────────────────────────

  downloadPdf: async (invoiceId: string): Promise<void> => {
    const tokens = JSON.parse(localStorage.getItem('cm_tokens') ?? '{}');
    const res = await fetch(`/api/invoices/${invoiceId}/pdf`, {
      headers: {
        ...(tokens.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
    });
    if (!res.ok) throw new Error('Erreur lors du téléchargement du PDF');
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? `facture-${invoiceId}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportFec: async (from: string, to: string): Promise<void> => {
    const tokens = JSON.parse(localStorage.getItem('cm_tokens') ?? '{}');
    const qs = new URLSearchParams({ from, to });
    const res = await fetch(`/api/invoices/export/csv?${qs}`, {
      headers: {
        ...(tokens.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
    });
    if (!res.ok) throw new Error("Erreur lors de l'export comptable");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FEC-${from}-${to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
