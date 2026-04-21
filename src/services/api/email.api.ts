import { http } from './http';

export interface SendEmailPayload {
  entityType: 'quote' | 'invoice';
  entityId: string;
  to: string;
  subject?: string;
  message?: string;
}

export interface EmailLog {
  id: string;
  entityType: string;
  entityId: string;
  recipientEmail: string;
  subject: string;
  status: string;
  error?: string;
  sentAt: string;
}

export const emailApi = {
  send: (payload: SendEmailPayload): Promise<{ sent: boolean }> =>
    http.post<{ sent: boolean }>('/email/send', payload),

  getLogs: (entityType: string, entityId: string): Promise<EmailLog[]> =>
    http.get<EmailLog[]>(`/email/logs?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`),
};
