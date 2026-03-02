import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface VatRateConfig {
  label: string;
  rate: number;
  accountOutput: string | null;
  accountInput: string | null;
}

interface FecLine {
  journalCode: string;
  journalLib: string;
  ecritureNum: string;
  ecritureDate: string;
  compteNum: string;
  compteLib: string;
  compAuxNum: string;
  compAuxLib: string;
  pieceRef: string;
  pieceDate: string;
  ecritureLib: string;
  debit: number;
  credit: number;
  ecrtureLet: string;
  dateLet: string;
  validDate: string;
  montantdevise: string;
  idevise: string;
}

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private fmtDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  private fmtAmount(n: number): string {
    return n.toFixed(2).replace('.', ',');
  }

  private fmtAmountDot(n: number): string {
    return n.toFixed(2);
  }

  private async getSettings(companyId: string) {
    let settings = await this.prisma.accountingSettings.findUnique({
      where: { companyId },
    });
    if (!settings) {
      // Create with defaults
      settings = await this.prisma.accountingSettings.create({
        data: { companyId },
      });
    }
    return settings;
  }

  private getVatAccount(
    vatRates: VatRateConfig[],
    rate: number,
    direction: 'output' | 'input',
  ): string | null {
    const match = vatRates.find((v) => Math.abs(v.rate - rate) < 0.01);
    if (!match) {
      // Fallback to default 20%
      return direction === 'output' ? '445710' : '445660';
    }
    return direction === 'output' ? match.accountOutput : match.accountInput;
  }

  // ─── FEC GENERATION ───────────────────────────────────────────────────────

  async generateFec(
    companyId: string,
    from: string,
    to: string,
    journal: 'VE' | 'AC' | 'ALL',
  ): Promise<string> {
    const settings = await this.getSettings(companyId);
    const vatRates = settings.vatRates as VatRateConfig[];
    const lines: FecLine[] = [];
    let ecritureNum = 1;

    const fromDate = new Date(from);
    const toDate = new Date(to + 'T23:59:59.999Z');

    // ── Journal Ventes (VE) ──
    if (journal === 'VE' || journal === 'ALL') {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          companyId,
          issuedAt: { gte: fromDate, lte: toDate },
          status: { in: ['sent', 'paid'] },
          deletedAt: null,
        },
        orderBy: { issuedAt: 'asc' },
        include: { client: { select: { id: true, name: true } } },
      });

      for (const inv of invoices) {
        const ht = Number(inv.amount);
        const rate = inv.vatRate ? Number(inv.vatRate) : 20;
        const tva = Math.round(ht * (rate / 100) * 100) / 100;
        const ttc = Math.round((ht + tva) * 100) / 100;
        const dateStr = this.fmtDate(inv.issuedAt);
        const validDate = inv.paidAt ? this.fmtDate(inv.paidAt) : dateStr;
        const clientName = inv.client?.name ?? '';
        const clientId = inv.client?.id ?? '';
        const num = String(ecritureNum);

        // Debit 411000 (TTC)
        lines.push({
          journalCode: 'VE',
          journalLib: 'Ventes',
          ecritureNum: num,
          ecritureDate: dateStr,
          compteNum: settings.accountClient,
          compteLib: 'Clients',
          compAuxNum: clientId,
          compAuxLib: clientName,
          pieceRef: inv.reference,
          pieceDate: dateStr,
          ecritureLib: `Facture ${inv.reference}`,
          debit: ttc,
          credit: 0,
          ecrtureLet: '',
          dateLet: '',
          validDate,
          montantdevise: '',
          idevise: 'EUR',
        });

        // Credit 706000 (HT)
        lines.push({
          journalCode: 'VE',
          journalLib: 'Ventes',
          ecritureNum: num,
          ecritureDate: dateStr,
          compteNum: settings.accountRevenue,
          compteLib: 'Prestations',
          compAuxNum: '',
          compAuxLib: '',
          pieceRef: inv.reference,
          pieceDate: dateStr,
          ecritureLib: `Prestation`,
          debit: 0,
          credit: ht,
          ecrtureLet: '',
          dateLet: '',
          validDate,
          montantdevise: '',
          idevise: 'EUR',
        });

        // Credit TVA (skip if rate == 0)
        if (rate > 0) {
          const vatAccount = this.getVatAccount(vatRates, rate, 'output');
          lines.push({
            journalCode: 'VE',
            journalLib: 'Ventes',
            ecritureNum: num,
            ecritureDate: dateStr,
            compteNum: vatAccount ?? settings.accountVatOutput,
            compteLib: `TVA collectee ${rate}%`,
            compAuxNum: '',
            compAuxLib: '',
            pieceRef: inv.reference,
            pieceDate: dateStr,
            ecritureLib: `TVA ${rate}%`,
            debit: 0,
            credit: tva,
            ecrtureLet: '',
            dateLet: '',
            validDate,
            montantdevise: '',
            idevise: 'EUR',
          });
        }

        ecritureNum++;
      }
    }

    // ── Journal Achats (AC) ──
    if (journal === 'AC' || journal === 'ALL') {
      const purchases = await this.prisma.purchaseOrder.findMany({
        where: {
          companyId,
          status: 'received',
          receivedAt: { gte: fromDate, lte: toDate },
          deletedAt: null,
        },
        orderBy: { receivedAt: 'asc' },
        include: { supplier: { select: { id: true, name: true } } },
      });

      for (const po of purchases) {
        const ht = Number(po.amount);
        // Default 20% TVA for purchases (no vatRate field on PO)
        const tvaRate = 20;
        const tva = Math.round(ht * (tvaRate / 100) * 100) / 100;
        const ttc = Math.round((ht + tva) * 100) / 100;
        const dateStr = po.receivedAt ? this.fmtDate(po.receivedAt) : this.fmtDate(po.orderedAt);
        const supplierName = po.supplier?.name ?? '';
        const supplierId = po.supplier?.id ?? '';
        const num = String(ecritureNum);

        // Debit 607000 (HT)
        lines.push({
          journalCode: 'AC',
          journalLib: 'Achats',
          ecritureNum: num,
          ecritureDate: dateStr,
          compteNum: settings.accountPurchases,
          compteLib: 'Achats',
          compAuxNum: '',
          compAuxLib: '',
          pieceRef: po.reference,
          pieceDate: dateStr,
          ecritureLib: `Commande ${po.reference}`,
          debit: ht,
          credit: 0,
          ecrtureLet: '',
          dateLet: '',
          validDate: dateStr,
          montantdevise: '',
          idevise: 'EUR',
        });

        // Debit 445660 TVA deductible
        const vatInputAccount = this.getVatAccount(vatRates, tvaRate, 'input');
        lines.push({
          journalCode: 'AC',
          journalLib: 'Achats',
          ecritureNum: num,
          ecritureDate: dateStr,
          compteNum: vatInputAccount ?? settings.accountVatInput,
          compteLib: `TVA deductible ${tvaRate}%`,
          compAuxNum: '',
          compAuxLib: '',
          pieceRef: po.reference,
          pieceDate: dateStr,
          ecritureLib: `TVA ${tvaRate}%`,
          debit: tva,
          credit: 0,
          ecrtureLet: '',
          dateLet: '',
          validDate: dateStr,
          montantdevise: '',
          idevise: 'EUR',
        });

        // Credit 401000 Fournisseurs (TTC)
        lines.push({
          journalCode: 'AC',
          journalLib: 'Achats',
          ecritureNum: num,
          ecritureDate: dateStr,
          compteNum: settings.accountSupplier,
          compteLib: 'Fournisseurs',
          compAuxNum: supplierId,
          compAuxLib: supplierName,
          pieceRef: po.reference,
          pieceDate: dateStr,
          ecritureLib: `Commande ${po.reference}`,
          debit: 0,
          credit: ttc,
          ecrtureLet: '',
          dateLet: '',
          validDate: dateStr,
          montantdevise: '',
          idevise: 'EUR',
        });

        ecritureNum++;
      }
    }

    // ── Validate balance ──
    this.validateFecBalance(lines);

    // ── Format output ──
    const headers = [
      'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
      'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
      'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
      'EcrtureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
    ];

    const rows = [headers.join(';')];
    for (const l of lines) {
      rows.push([
        l.journalCode, l.journalLib, l.ecritureNum, l.ecritureDate,
        l.compteNum, l.compteLib, l.compAuxNum, l.compAuxLib,
        l.pieceRef, l.pieceDate, l.ecritureLib,
        this.fmtAmount(l.debit), this.fmtAmount(l.credit),
        l.ecrtureLet, l.dateLet, l.validDate, l.montantdevise, l.idevise,
      ].join(';'));
    }

    return rows.join('\n');
  }

  private validateFecBalance(lines: FecLine[]) {
    // Group by ecritureNum, check debit == credit for each
    const groups = new Map<string, { debit: number; credit: number }>();
    for (const l of lines) {
      const g = groups.get(l.ecritureNum) ?? { debit: 0, credit: 0 };
      g.debit += l.debit;
      g.credit += l.credit;
      groups.set(l.ecritureNum, g);
    }

    for (const [num, g] of groups) {
      const diff = Math.abs(g.debit - g.credit);
      if (diff > 0.01) {
        throw new InternalServerErrorException(
          `FEC desequilibre ecriture ${num}: debit=${g.debit.toFixed(2)} credit=${g.credit.toFixed(2)}`,
        );
      }
    }
  }

  // ─── SAGE FORMAT ──────────────────────────────────────────────────────────

  async generateSage(companyId: string, from: string, to: string): Promise<string> {
    const fecContent = await this.generateFec(companyId, from, to, 'ALL');
    const fecLines = fecContent.split('\n').slice(1); // skip header

    const headers = ['N°Piece', 'Date', 'Journal', 'N°Compte', 'Libelle', 'Debit', 'Credit', 'Reference'];
    const rows = [headers.join(';')];

    for (const line of fecLines) {
      if (!line.trim()) continue;
      const cols = line.split(';');
      // FEC columns: 0=JournalCode 2=EcritureNum 3=EcritureDate 4=CompteNum 10=EcritureLib 11=Debit 12=Credit 8=PieceRef
      const dateRaw = cols[3]; // YYYYMMDD
      const dateFmt = `${dateRaw.slice(6, 8)}/${dateRaw.slice(4, 6)}/${dateRaw.slice(0, 4)}`;
      rows.push([
        cols[2],    // N°Piece
        dateFmt,    // Date DD/MM/YYYY
        cols[0],    // Journal
        cols[4],    // N°Compte
        cols[10],   // Libelle
        cols[11],   // Debit
        cols[12],   // Credit
        cols[8],    // Reference
      ].join(';'));
    }

    return rows.join('\n');
  }

  // ─── EBP FORMAT ───────────────────────────────────────────────────────────

  async generateEbp(companyId: string, from: string, to: string): Promise<string> {
    const fecContent = await this.generateFec(companyId, from, to, 'ALL');
    const fecLines = fecContent.split('\n').slice(1);

    const headers = ['Date', 'Code journal', 'N° piece', 'N° compte', 'Libelle', 'Debit', 'Credit'];
    const rows = [headers.join(';')];

    for (const line of fecLines) {
      if (!line.trim()) continue;
      const cols = line.split(';');
      const dateRaw = cols[3];
      const dateFmt = `${dateRaw.slice(6, 8)}/${dateRaw.slice(4, 6)}/${dateRaw.slice(0, 4)}`;
      rows.push([
        dateFmt,    // Date DD/MM/YYYY
        cols[0],    // Code journal
        cols[2],    // N° piece
        cols[4],    // N° compte
        cols[10],   // Libelle
        cols[11],   // Debit
        cols[12],   // Credit
      ].join(';'));
    }

    return rows.join('\n');
  }

  // ─── ACCOUNTING SETTINGS ─────────────────────────────────────────────────

  async getAccountingSettings(companyId: string) {
    return this.getSettings(companyId);
  }

  async updateAccountingSettings(companyId: string, data: Partial<{
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
  }>) {
    const settings = await this.getSettings(companyId);
    return this.prisma.accountingSettings.update({
      where: { id: settings.id },
      data,
    });
  }
}
