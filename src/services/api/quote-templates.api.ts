import { http } from './http';

export interface QuoteTemplateLine {
  id: string;
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  sortOrder: number;
  catalogProductId: string | null;
}

export interface QuoteTemplate {
  id: string;
  name: string;
  description: string | null;
  usageCount: number;
  companyId: string;
  createdAt: string;
  lines: QuoteTemplateLine[];
  _count: { lines: number };
}

export interface CreateFromQuotePayload {
  name: string;
  description?: string;
  quoteId: string;
}

export interface CreateQuoteFromTemplatePayload {
  clientId: string;
  subject: string;
  validUntil: string;
}

export const quoteTemplatesApi = {
  getAll: (): Promise<QuoteTemplate[]> =>
    http.get<QuoteTemplate[]>('/quote-templates'),

  createFromQuote: (data: CreateFromQuotePayload): Promise<QuoteTemplate> =>
    http.post<QuoteTemplate>('/quote-templates', data),

  createQuoteFromTemplate: (templateId: string, data: CreateQuoteFromTemplatePayload): Promise<any> =>
    http.post(`/quote-templates/${templateId}/create-quote`, data),

  remove: (id: string): Promise<void> =>
    http.delete<void>(`/quote-templates/${id}`),
};
