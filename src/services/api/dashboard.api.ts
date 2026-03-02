import { http } from './http';

export interface CashflowSnapshot {
  totalReceived: number;
  totalOutstanding: number;
  totalOverdue: number;
  totalPurchasesPaid: number;
  totalPurchasesPending: number;
}

export interface CashflowProjection {
  period: '30j' | '60j' | '90j';
  expectedIn: number;
  expectedOut: number;
  estimatedBilling: number;
  netPosition: number;
}

export interface ExpectedInflow {
  invoiceRef: string;
  clientName: string;
  amount: number;
  amountTTC: number;
  dueDate: string;
  daysUntilDue: number;
  status: string;
  isImported: boolean;
}

export interface ExpectedOutflow {
  purchaseRef: string;
  supplierName: string;
  amount: number;
  orderedAt: string;
  jobRef: string | null;
}

export interface EstimatedBilling {
  jobRef: string;
  title: string;
  clientName: string;
  totalContract: number;
  totalInvoiced: number;
  remainingToInvoice: number;
  estimatedEmissionDate: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceReason: string;
  billingRule: string;
}

export interface CashflowForecast {
  snapshot: CashflowSnapshot;
  projections: CashflowProjection[];
  expectedInflows: ExpectedInflow[];
  expectedOutflows: ExpectedOutflow[];
  estimatedBilling: EstimatedBilling[];
}

export const dashboardApi = {
  getCashflow: (horizon = 90): Promise<CashflowForecast> =>
    http.get<CashflowForecast>(`/dashboard/cashflow?horizon=${horizon}`),
};
