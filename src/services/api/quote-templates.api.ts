import { api } from './client';

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
    api.get('/quote-templates').then(r => r.data),

  createFromQuote: (data: CreateFromQuotePayload): Promise<QuoteTemplate> =>
    api.post('/quote-templates', data).then(r => r.data),

  createQuoteFromTemplate: (templateId: string, data: CreateQuoteFromTemplatePayload): Promise<any> =>
    api.post(`/quote-templates/${templateId}/create-quote`, data).then(r => r.data),

  remove: (id: string): Promise<void> =>
    api.delete(`/quote-templates/${id}`).then(r => r.data),
};
