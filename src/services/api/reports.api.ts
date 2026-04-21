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

export const reportsApi = {
  getHoursReport: (weekOf: string, groupBy: 'user' | 'job'): Promise<HoursReport> =>
    http.get<HoursReport>(`/reports/hours?weekOf=${encodeURIComponent(weekOf)}&groupBy=${groupBy}`),

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
