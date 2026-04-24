import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getCashflow(companyId: string | null, horizon: number) {
    const now = new Date();

    // ── Get accounting settings for billing delays ──
    let billingDelayInProgress = 14;
    let billingDelayCompleted = 7;
    if (companyId) {
      const settings = await this.prisma.accountingSettings.findUnique({
        where: { companyId },
      });
      if (settings) {
        billingDelayInProgress = settings.billingDelayInProgress;
        billingDelayCompleted = settings.billingDelayCompleted;
      }
    }

    // ── Snapshot ──
    const invoiceWhere: any = { deletedAt: null };
    if (companyId) invoiceWhere.companyId = companyId;

    const allInvoices = await this.prisma.invoice.findMany({
      where: invoiceWhere,
      include: { client: { select: { name: true } } },
    });

    const totalReceived = allInvoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + Number(i.amount), 0);

    const outstanding = allInvoices.filter((i) =>
      ['sent', 'overdue'].includes(i.status),
    );
    const totalOutstanding = outstanding.reduce(
      (s, i) => s + Number(i.amount),
      0,
    );
    const totalOverdue = allInvoices
      .filter((i) => i.status === 'overdue')
      .reduce((s, i) => s + Number(i.amount), 0);

    const purchaseWhere: any = { deletedAt: null };
    if (companyId) purchaseWhere.companyId = companyId;

    const allPurchases = await this.prisma.purchaseOrder.findMany({
      where: purchaseWhere,
      include: {
        supplier: { select: { name: true } },
        job: { select: { reference: true } },
      },
    });

    const totalPurchasesPaid = allPurchases
      .filter((p) => p.status === 'received')
      .reduce((s, p) => s + Number(p.amount), 0);
    const totalPurchasesPending = allPurchases
      .filter((p) => ['draft', 'ordered'].includes(p.status))
      .reduce((s, p) => s + Number(p.amount), 0);

    // ── Expected inflows (invoices sent/overdue) ──
    const expectedInflows: ExpectedInflow[] = outstanding.map((inv) => {
      const dueDate = inv.dueDate;
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - now.getTime()) / 86400000,
      );
      const vatRate = inv.vatRate ? Number(inv.vatRate) : 20;
      const ht = Number(inv.amount);
      const ttc = Math.round(ht * (1 + vatRate / 100) * 100) / 100;

      return {
        invoiceRef: inv.reference,
        clientName: inv.client?.name ?? '',
        amount: ht,
        amountTTC: ttc,
        dueDate: dueDate.toISOString().slice(0, 10),
        daysUntilDue,
        status: inv.status,
        isImported: inv.isImported,
      };
    });

    // ── Expected outflows (pending purchases) ──
    const expectedOutflows: ExpectedOutflow[] = allPurchases
      .filter((p) => ['draft', 'ordered'].includes(p.status))
      .map((po) => ({
        purchaseRef: po.reference,
        supplierName: po.supplier?.name ?? '',
        amount: Number(po.amount),
        orderedAt: po.orderedAt.toISOString().slice(0, 10),
        jobRef: po.job?.reference ?? null,
      }));

    // ── Estimated billing (remaining to invoice on jobs) ──
    const jobWhere: any = {
      deletedAt: null,
      status: { in: ['in_progress', 'completed'] },
      quoteId: { not: null },
    };
    if (companyId) jobWhere.companyId = companyId;

    const jobs = await this.prisma.job.findMany({
      where: jobWhere,
      include: {
        quote: {
          select: {
            amount: true,
            client: { select: { name: true } },
          },
        },
        invoices: {
          where: { deletedAt: null },
          select: {
            situations: {
              select: { cumulativeAmount: true, status: true },
              orderBy: { number: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const estimatedBilling: EstimatedBilling[] = [];

    for (const job of jobs) {
      const quoteAmount = Number(job.quote?.amount ?? 0);

      // Add accepted amendments
      const amendmentResult = await this.prisma.quoteAmendment.aggregate({
        where: {
          quoteId: job.quoteId!,
          status: 'accepted',
          deletedAt: null,
        },
        _sum: { amount: true },
      });
      const amendmentTotal = Number(amendmentResult._sum.amount ?? 0);
      const totalContract = quoteAmount + amendmentTotal;

      // Get latest situation cumulative amount per invoice
      let totalInvoiced = 0;
      for (const inv of job.invoices) {
        if (inv.situations.length > 0) {
          totalInvoiced += Number(inv.situations[0].cumulativeAmount);
        }
      }

      // If no situations, check if any direct invoices
      if (totalInvoiced === 0) {
        const directInvoices = await this.prisma.invoice.findMany({
          where: { jobId: job.id, deletedAt: null, status: { in: ['sent', 'paid'] } },
          select: { amount: true },
        });
        totalInvoiced = directInvoices.reduce(
          (s, i) => s + Number(i.amount),
          0,
        );
      }

      const remaining = totalContract - totalInvoiced;
      if (remaining <= 0) continue;

      // Get all situations for confidence calc
      const allSituations = await this.prisma.invoiceSituation.findMany({
        where: {
          invoice: { jobId: job.id, deletedAt: null },
          status: { in: ['validated', 'sent', 'paid'] },
        },
        orderBy: { date: 'asc' },
        select: { date: true },
      });

      let estimatedDate: Date;
      let rule: string;
      let confidence: 'high' | 'medium' | 'low';
      let confidenceReason: string;

      if (job.status === 'completed') {
        estimatedDate = addDays(now, billingDelayCompleted);
        rule = `Termine, emission sous ${billingDelayCompleted}j`;
        confidence = 'high';
        confidenceReason = 'Chantier termine, facturation imminente';
      } else if (allSituations.length >= 2) {
        // Check if billing is regular
        const avgInterval = averageIntervalDays(
          allSituations.map((s) => s.date),
        );
        estimatedDate = addDays(now, billingDelayInProgress);
        rule = `Prochaine situation sous ${billingDelayInProgress}j`;

        if (avgInterval < 45) {
          confidence = 'high';
          confidenceReason = `Facturation reguliere (~${Math.round(avgInterval)}j entre situations)`;
        } else {
          confidence = 'medium';
          confidenceReason = `Intervalle moyen ${Math.round(avgInterval)}j entre situations`;
        }
      } else if (allSituations.length === 1) {
        estimatedDate = addDays(now, billingDelayInProgress);
        rule = `Prochaine situation sous ${billingDelayInProgress}j`;
        confidence = 'medium';
        confidenceReason = 'Une seule situation, rythme non etabli';
      } else {
        estimatedDate = addDays(now, 30);
        rule = 'Premiere facturation estimee sous 30j';
        confidence = 'low';
        confidenceReason = 'Aucune situation emise, estimation incertaine';
      }

      estimatedBilling.push({
        jobRef: job.reference,
        title: job.title,
        clientName: job.quote?.client?.name ?? '',
        totalContract,
        totalInvoiced,
        remainingToInvoice: remaining,
        estimatedEmissionDate: estimatedDate.toISOString().slice(0, 10),
        confidence,
        confidenceReason,
        billingRule: rule,
      });
    }

    // ── Projections 30/60/90 ──
    const periods: Array<{ label: '30j' | '60j' | '90j'; days: number }> = [
      { label: '30j', days: 30 },
      { label: '60j', days: 60 },
      { label: '90j', days: 90 },
    ];

    const projections: CashflowProjection[] = periods
      .filter((p) => p.days <= horizon)
      .map((p) => {
        const cutoff = addDays(now, p.days);

        const expectedIn = expectedInflows
          .filter((i) => new Date(i.dueDate) <= cutoff)
          .reduce((s, i) => s + i.amountTTC, 0);

        const expectedOut = expectedOutflows
          .filter((o) => new Date(o.orderedAt) <= cutoff)
          .reduce((s, o) => s + o.amount, 0);

        const billing = estimatedBilling
          .filter((b) => new Date(b.estimatedEmissionDate) <= cutoff)
          .reduce((s, b) => s + b.remainingToInvoice, 0);

        return {
          period: p.label,
          expectedIn,
          expectedOut,
          estimatedBilling: billing,
          netPosition: expectedIn + billing - expectedOut,
        };
      });

    return {
      snapshot: {
        totalReceived,
        totalOutstanding,
        totalOverdue,
        totalPurchasesPaid,
        totalPurchasesPending,
      },
      projections,
      expectedInflows: expectedInflows.sort(
        (a, b) => a.daysUntilDue - b.daysUntilDue,
      ),
      expectedOutflows,
      estimatedBilling: estimatedBilling.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.confidence] - order[b.confidence];
      }),
    };
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function averageIntervalDays(dates: Date[]): number {
  if (dates.length < 2) return Infinity;
  let totalDays = 0;
  for (let i = 1; i < dates.length; i++) {
    totalDays += Math.abs(dates[i].getTime() - dates[i - 1].getTime()) / 86400000;
  }
  return totalDays / (dates.length - 1);
}
