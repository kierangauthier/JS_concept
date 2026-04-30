import { http } from './http';

export interface HoursReportRow {
  id: string;
  label: string;
  planned: number;
  actual: number;
  delta: number;
  ratio: number;
  estimated?: number | null;
}

export interface HoursReport {
  weekOf: string;
  groupBy: 'user' | 'job';
  rows: HoursReportRow[];
  totals: { planned: number; actual: number };
}

export interface MonthlyRevenueRow { month: string; revenue: number; invoiceCount: number; }
export interface TopClientRow { rank: number; clientId: string; clientName: string; revenue: number; jobCount: number; }
export interface PipelineStage { status: string; label: string; total: number; count: number; }
export interface OverdueInvoiceRow {
  id: string; reference: string; clientName: string;
  amount: number; dueDate: string; daysOverdue: number;
}
export interface TeamWorkloadCell { teamId: string; weekStart: string; hours: number; }
export interface TeamWorkloadResponse {
  teams: Array<{ id: string; name: string }>;
  cells: TeamWorkloadCell[];
}

export const reportsApi = {
  getHoursReport: (weekOf: string, groupBy: 'user' | 'job'): Promise<HoursReport> =>
    http.get<HoursReport>(`/reports/hours?weekOf=${encodeURIComponent(weekOf)}&groupBy=${groupBy}`),

  getMonthlyRevenue: (): Promise<{ months: MonthlyRevenueRow[] }> =>
    http.get('/reports/monthly-revenue'),

  getTopClients: (): Promise<{ clients: TopClientRow[] }> =>
    http.get('/reports/top-clients'),

  getPipeline: (): Promise<{ stages: PipelineStage[] }> =>
    http.get('/reports/pipeline'),

  getOverdueInvoices: (): Promise<{ invoices: OverdueInvoiceRow[] }> =>
    http.get('/reports/overdue-invoices'),

  getTeamWorkload: (): Promise<TeamWorkloadResponse> =>
    http.get('/reports/team-workload'),

  exportHoursCsv: async (weekOf: string, groupBy: 'user' | 'job'): Promise<void> => {
    const tokens = JSON.parse(localStorage.getItem('cm_tokens') ?? '{}');
    const res = await fetch(`/api/reports/hours/export?weekOf=${weekOf}&groupBy=${groupBy}`, {
      headers: {
        ...(tokens.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
        ...(localStorage.getItem('cm_selected_company')
          ? { 'X-Company-Id': localStorage.getItem('cm_selected_company')! }
          : {}),
      },
    });
    if (!res.ok) throw new Error('Erreur export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-heures-${weekOf}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
