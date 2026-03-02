import { api } from './client';

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
  send: (payload: SendEmailPayload) =>
    api.post('/email/send', payload).then(r => r.data),

  getLogs: (entityType: string, entityId: string): Promise<EmailLog[]> =>
    api.get('/email/logs', { params: { entityType, entityId } }).then(r => r.data),
};
