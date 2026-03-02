import { api } from './client';

export interface ReminderRule {
  id: string;
  level: number;
  delayDays: number;
  subject: string;
  bodyTemplate: string;
  isActive: boolean;
  companyId: string;
}

export interface ReminderLog {
  id: string;
  invoiceId: string;
  ruleId: string;
  sentAt: string;
  recipientEmail: string;
  status: 'sent' | 'failed' | 'simulated';
  error: string | null;
  rule?: { level: number; delayDays: number };
}

export interface CreateReminderRulePayload {
  level: number;
  delayDays: number;
  subject: string;
  bodyTemplate: string;
  isActive?: boolean;
}

export const remindersApi = {
  getRules: (): Promise<ReminderRule[]> =>
    api.get('/reminders/rules').then(r => r.data),

  createRule: (data: CreateReminderRulePayload): Promise<ReminderRule> =>
    api.post('/reminders/rules', data).then(r => r.data),

  updateRule: (id: string, data: Partial<CreateReminderRulePayload>): Promise<ReminderRule> =>
    api.patch(`/reminders/rules/${id}`, data).then(r => r.data),

  deleteRule: (id: string): Promise<void> =>
    api.delete(`/reminders/rules/${id}`).then(r => r.data),

  getLogsByInvoice: (invoiceId: string): Promise<ReminderLog[]> =>
    api.get(`/reminders/invoices/${invoiceId}/logs`).then(r => r.data),

  runManual: (): Promise<{ processed: boolean; results: Array<{ companyId: string; sent: number; errors: string[] }> }> =>
    api.post('/reminders/run').then(r => r.data),
};
