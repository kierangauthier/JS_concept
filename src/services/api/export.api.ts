import { http } from './http';

export type ExportFormat = 'fec' | 'sage' | 'ebp';
export type FecJournal = 'VE' | 'AC' | 'ALL';

export interface VatRateConfig {
  label: string;
  rate: number;
  accountOutput: string | null;
  accountInput: string | null;
}

export interface AccountingSettings {
  id: string;
  companyId: string;
  accountClient: string;
  accountRevenue: string;
  accountVatOutput: string;
  accountSupplier: string;
  accountPurchases: string;
  accountVatInput: string;
  accountBank: string;
  accountCashIn: string;
  accountCashOut: string;
  vatRates: VatRateConfig[];
  billingDelayInProgress: number;
  billingDelayCompleted: number;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getAuthHeaders(): Record<string, string> {
  const tokens = JSON.parse(localStorage.getItem('cm_tokens') ?? '{}');
  const companyScope = localStorage.getItem('cm_company') ?? '';
  return {
    ...(tokens.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
    ...(companyScope ? { 'X-Company-Id': companyScope } : {}),
  };
}

async function fetchExport(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Erreur lors de l'export");
  const blob = await res.blob();
  downloadBlob(blob, filename);
}

export const exportApi = {
  downloadFec: (from: string, to: string, journal: FecJournal = 'ALL'): Promise<void> => {
    const qs = new URLSearchParams({ from, to, journal });
    return fetchExport(`/api/export/fec?${qs}`, `FEC-${journal}-${from}-${to}.csv`);
  },

  downloadSage: (from: string, to: string): Promise<void> => {
    const qs = new URLSearchParams({ from, to });
    return fetchExport(`/api/export/sage?${qs}`, `Sage-${from}-${to}.csv`);
  },

  downloadEbp: (from: string, to: string): Promise<void> => {
    const qs = new URLSearchParams({ from, to });
    return fetchExport(`/api/export/ebp?${qs}`, `EBP-${from}-${to}.csv`);
  },

  getSettings: (): Promise<AccountingSettings> =>
    http.get<AccountingSettings>('/settings/accounting'),

  updateSettings: (data: Partial<AccountingSettings>): Promise<AccountingSettings> =>
    http.patch<AccountingSettings>('/settings/accounting', data),
};
