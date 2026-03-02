/**
 * E2E Qualification Seed — extends the base seed with data that exercises:
 * - FEC export (multi-taux TVA, journal achats on receivedAt)
 * - Cashflow projections (confidence levels, estimated billing)
 * - Import CSV re-import idempotency
 *
 * Run AFTER base seed: npx ts-node prisma/seed-e2e.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Seeding E2E qualification data...');

  // ─── 1. ACCOUNTING SETTINGS (ASP) ────────────────────────────────
  await prisma.accountingSettings.upsert({
    where: { companyId: 'co_asp' },
    update: {},
    create: {
      companyId: 'co_asp',
      accountClient: '411000',
      accountRevenue: '706000',
      accountVatOutput: '445710',
      accountSupplier: '401000',
      accountPurchases: '607000',
      accountVatInput: '445660',
      accountBank: '512000',
      accountCashIn: '512100',
      accountCashOut: '512200',
      vatRates: [
        { label: 'Normal', rate: 20.00, accountOutput: '445710', accountInput: '445660' },
        { label: 'Réduit', rate: 10.00, accountOutput: '445711', accountInput: '445661' },
        { label: 'Exonéré', rate: 0, accountOutput: null, accountInput: null },
      ],
      billingDelayInProgress: 14,
      billingDelayCompleted: 7,
    },
  });

  // ─── 2. SET receivedAt ON PURCHASE ORDERS ─────────────────────────
  // po_asp1 = received 2026-02-01 (for FEC achats test)
  await prisma.purchaseOrder.update({
    where: { id: 'po_asp1' },
    data: { receivedAt: new Date('2026-02-01') },
  });
  // po_asp4 = received 2025-12-10
  await prisma.purchaseOrder.update({
    where: { id: 'po_asp4' },
    data: { receivedAt: new Date('2025-12-10') },
  });

  // ─── 3. SET vatRate ON EXISTING INVOICES ──────────────────────────
  // inv_asp2 = sent, TVA 20%
  await prisma.invoice.update({
    where: { id: 'inv_asp2' },
    data: { vatRate: 20 },
  });
  // inv_asp3 = paid, TVA 10% (test multi-taux)
  await prisma.invoice.update({
    where: { id: 'inv_asp3' },
    data: { vatRate: 10 },
  });

  // ─── 4. ADD MORE INVOICES FOR FEC / CASHFLOW ──────────────────────
  // Overdue invoice (for cashflow alert)
  await prisma.invoice.upsert({
    where: { id: 'inv_asp_overdue' },
    update: {},
    create: {
      id: 'inv_asp_overdue',
      reference: 'FAC-ASP-2025-010',
      amount: 6800,
      status: 'overdue',
      issuedAt: new Date('2025-12-01'),
      dueDate: new Date('2026-01-01'),
      vatRate: 20,
      clientId: 'cl_asp3',
      jobId: 'j_asp1',
      companyId: 'co_asp',
    },
  });

  // Sent invoice TVA 10% (for multi-taux FEC test)
  await prisma.invoice.upsert({
    where: { id: 'inv_asp_10pct' },
    update: {},
    create: {
      id: 'inv_asp_10pct',
      reference: 'FAC-ASP-2026-010',
      amount: 3500,
      status: 'sent',
      issuedAt: new Date('2026-02-10'),
      dueDate: new Date('2026-03-12'),
      vatRate: 10,
      clientId: 'cl_asp4',
      jobId: 'j_asp4',
      companyId: 'co_asp',
    },
  });

  // Paid invoice TVA 0% (exonéré — for zero-TVA FEC test)
  await prisma.invoice.upsert({
    where: { id: 'inv_asp_exo' },
    update: {},
    create: {
      id: 'inv_asp_exo',
      reference: 'FAC-ASP-2026-011',
      amount: 2200,
      status: 'paid',
      issuedAt: new Date('2026-01-15'),
      dueDate: new Date('2026-02-15'),
      paidAt: new Date('2026-02-12'),
      vatRate: 0,
      clientId: 'cl_asp5',
      companyId: 'co_asp',
      // No jobId — invoice sans chantier
    },
  });

  // ─── 5. INVOICE SITUATIONS (for cashflow confidence) ──────────────
  // j_asp1 has quote q_asp1 (28500€) — add 3 situations = high confidence
  // Situation 1: 30% = 8550€
  await prisma.invoiceSituation.upsert({
    where: { id: 'sit_asp1_1' },
    update: {},
    create: {
      id: 'sit_asp1_1',
      number: 1,
      label: 'Situation 1 — Pré-marquage',
      percentage: 30,
      amount: 8550,
      cumulativeAmount: 8550,
      status: 'paid',
      date: new Date('2026-01-20'),
      invoiceId: 'inv_asp1',
    },
  });
  // Situation 2: 50% cumul = 14250€ (delta = 5700€)
  await prisma.invoiceSituation.upsert({
    where: { id: 'sit_asp1_2' },
    update: {},
    create: {
      id: 'sit_asp1_2',
      number: 2,
      label: 'Situation 2 — Marquage km 0-4',
      percentage: 50,
      amount: 5700,
      cumulativeAmount: 14250,
      status: 'validated',
      date: new Date('2026-02-10'),
      invoiceId: 'inv_asp1',
    },
  });
  // Situation 3: 70% cumul = 19950€ (delta = 5700€)
  await prisma.invoiceSituation.upsert({
    where: { id: 'sit_asp1_3' },
    update: {},
    create: {
      id: 'sit_asp1_3',
      number: 3,
      label: 'Situation 3 — Marquage km 4-8',
      percentage: 70,
      amount: 5700,
      cumulativeAmount: 19950,
      status: 'draft',
      date: new Date('2026-02-28'),
      invoiceId: 'inv_asp1',
    },
  });

  // ─── 6. QUOTE AMENDMENT (for cashflow totalContract) ──────────────
  await prisma.quoteAmendment.upsert({
    where: { id: 'amend_asp1_1' },
    update: {},
    create: {
      id: 'amend_asp1_1',
      reference: 'AVN-ASP-2026-001',
      subject: 'Travaux supplémentaires intersection km 6',
      amount: 4500,
      status: 'accepted',
      quoteId: 'q_asp1',
      companyId: 'co_asp',
    },
  });

  // ─── 7. COMPTABLE USER (for export RBAC test) ─────────────────────
  const hash = bcrypt.hashSync('Demo1234!', 10);
  await prisma.user.upsert({
    where: { id: 'u_asp_compta' },
    update: {},
    create: {
      id: 'u_asp_compta',
      email: 'compta@asp.fr',
      passwordHash: hash,
      name: 'Émilie Comptable',
      role: 'comptable',
      companyId: 'co_asp',
    },
  });

  console.log('');
  console.log('✅ E2E seed completed');
  console.log('');
  console.log('  AccountingSettings : 1 (ASP with multi-taux TVA)');
  console.log('  PurchaseOrders     : 2 updated with receivedAt');
  console.log('  Invoices updated   : 2 (vatRate set)');
  console.log('  Invoices added     : 3 (overdue, 10%, exonéré)');
  console.log('  InvoiceSituations  : 3 (j_asp1 — high confidence)');
  console.log('  QuoteAmendments    : 1 (4500€ accepted on q_asp1)');
  console.log('  Users added        : 1 (compta@asp.fr — comptable)');
  console.log('');
  console.log('  FEC test range: 2025-12-01 to 2026-03-01');
  console.log('  Expected FEC ventes: inv_asp2 (sent 20%), inv_asp3 (paid 10%), inv_asp_overdue (overdue 20%), inv_asp_10pct (sent 10%), inv_asp_exo (paid 0%)');
  console.log('  Expected FEC achats: po_asp1 (received 2026-02-01), po_asp4 (received 2025-12-10)');
  console.log('  Cashflow j_asp1: totalContract=33000€ (28500+4500), totalInvoiced=19950€, remaining=13050€, confidence=high');
}

main().catch(console.error).finally(() => prisma.$disconnect());
