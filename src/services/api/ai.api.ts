import { http } from './http';

// ─── Types ────────────────────────────────────────────────────────────────

export interface QuoteLineAI {
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface ExtractQuoteLinesResponse {
  subject: string;
  lines: QuoteLineAI[];
  confidence: 'high' | 'medium' | 'low';
  rawDescription: string;
}

export interface DraftReminderResponse {
  subject: string;
  body: string;
  tone: 'courteous' | 'firm' | 'urgent';
  level: number;
}

export interface BriefingAction {
  priority: 'critical' | 'high' | 'medium';
  category: string;
  action: string;
  detail: string;
  link?: string;
}

export interface DailyBriefingResponse {
  summary: string;
  actions: BriefingAction[];
  generatedAt: string;
}

export interface AiStatus {
  configured: boolean;
  message: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  type: 'quote' | 'invoice' | 'job' | 'client' | 'document' | 'purchase';
  id: string;
  label: string;
  link: string;
}

export interface ChatResponse {
  message: string;
  sources?: ChatSource[];
}

// ─── API ──────────────────────────────────────────────────────────────────

export const aiApi = {
  status: () =>
    http.get<AiStatus>('/ai/status'),

  extractQuoteLines: (description: string) =>
    http.post<ExtractQuoteLinesResponse>('/ai/extract-quote-lines', { description }),

  draftReminder: (invoiceId: string) =>
    http.post<DraftReminderResponse>('/ai/draft-reminder', { invoiceId }),

  getDailyBriefing: () =>
    http.get<DailyBriefingResponse>('/ai/daily-briefing'),

  chat: (message: string, history: ChatMessage[] = []) =>
    http.post<ChatResponse>('/ai/chat', { message, history }),
};
