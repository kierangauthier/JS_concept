import { http } from './http';

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

type RunResult = { processed: boolean; results: Array<{ companyId: string; sent: number; errors: string[] }> };

export const remindersApi = {
  getRules: (): Promise<ReminderRule[]> =>
    http.get<ReminderRule[]>('/reminders/rules'),

  createRule: (data: CreateReminderRulePayload): Promise<ReminderRule> =>
    http.post<ReminderRule>('/reminders/rules', data),

  updateRule: (id: string, data: Partial<CreateReminderRulePayload>): Promise<ReminderRule> =>
    http.patch<ReminderRule>(`/reminders/rules/${id}`, data),

  deleteRule: (id: string): Promise<void> =>
    http.delete<void>(`/reminders/rules/${id}`),

  getLogsByInvoice: (invoiceId: string): Promise<ReminderLog[]> =>
    http.get<ReminderLog[]>(`/reminders/invoices/${invoiceId}/logs`),

  runManual: (): Promise<RunResult> =>
    http.post<RunResult>('/reminders/run'),
};
