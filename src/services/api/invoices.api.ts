import { http } from './http';
import { Invoice } from '@/types';

/** V6 — Thrown when the Factur-X endpoint refuses to emit (e.g. missing legal fields). */
export class FacturXError extends Error {
  public readonly status: number;
  public readonly missing: string[];
  public readonly payload: unknown;

  constructor(status: number, payload: unknown) {
    const body = (payload ?? {}) as { message?: string | string[]; missing?: string[] };
    const raw = Array.isArray(body.message) ? body.message[0] : body.message;
    const msg = raw ?? 'Impossible de générer le Factur-X';
    super(msg);
    this.name = 'FacturXError';
    this.status = status;
    this.missing = Array.isArray(body.missing) ? body.missing : [];
    this.payload = payload;
  }
}

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

  /** Fetch the PDF as a blob URL for in-browser preview. Caller must revoke the URL. */
  previewPdf: async (invoiceId: string): Promise<string> => {
    const tokens = JSON.parse(localStorage.getItem('cm_tokens') ?? '{}');
    const res = await fetch(`/api/invoices/${invoiceId}/pdf`, {
      headers: {
        ...(tokens.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
    });
    if (!res.ok) throw new Error('Erreur lors de la génération du PDF');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  /**
   * V6 — Download the Factur-X hybrid PDF/A-3.
   * Throws a FacturXMissingFieldsError (extends Error) with the `missing`
   * list when the backend answers 422, so the UI can show a precise prompt.
   */
  downloadFacturX: async (invoiceId: string): Promise<void> => {
    const tokens = JSON.parse(localStorage.getItem('cm_tokens') ?? '{}');
    const res = await fetch(`/api/invoices/${invoiceId}/facturx`, {
      headers: {
        ...(tokens.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
    });
    if (!res.ok) {
      let detail: unknown = undefined;
      try { detail = await res.json(); } catch { /* non-JSON error body */ }
      const err = new FacturXError(res.status, detail);
      throw err;
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? `facture-${invoiceId}.factur-x.pdf`;
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
