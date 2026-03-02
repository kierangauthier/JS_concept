import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, UpdateInvoiceDto, CreateSituationDto } from './dto/create-invoice.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');
import { TDocumentDefinitions } from 'pdfmake/interfaces';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private mapInvoice(i: any) {
    return {
      id: i.id,
      reference: i.reference,
      clientName: i.client?.name ?? '',
      jobRef: i.job?.reference ?? null,
      amount: Number(i.amount),
      status: i.status,
      company: i.company?.code ?? '',
      issuedAt: i.issuedAt.toISOString(),
      dueDate: i.dueDate.toISOString(),
      paidAt: i.paidAt?.toISOString() ?? null,
    };
  }

  private includes = {
    client: { select: { name: true } },
    job: { select: { reference: true } },
    company: { select: { code: true } },
  };

  async findAll(companyId: string | null, pagination: PaginationDto) {
    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip: pagination.skip, take: pagination.limit,
        orderBy: { createdAt: 'desc' }, include: this.includes,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data: data.map(this.mapInvoice), total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;
    const invoice = await this.prisma.invoice.findFirst({
      where,
      include: { ...this.includes, situations: { orderBy: { number: 'asc' } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return {
      ...this.mapInvoice(invoice),
      situations: invoice.situations.map((s) => ({
        id: s.id, number: s.number, label: s.label,
        percentage: Number(s.percentage), amount: Number(s.amount),
        status: s.status, date: s.date.toISOString(),
      })),
    };
  }

  async create(dto: CreateInvoiceDto, companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const year = new Date().getFullYear();

    const invoice = await this.prisma.$transaction(async (tx) => {
      const result = await tx.$queryRaw<[{ next_val: bigint }]>`
        SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_val
        FROM "invoices"
        WHERE "companyId" = ${companyId}
        FOR UPDATE
      `;
      const nextVal = Number(result[0].next_val);
      const ref = `FAC-${company!.code}-${year}-${String(nextVal).padStart(3, '0')}`;

      return tx.invoice.create({
        data: {
          id: createId(), reference: ref, amount: dto.amount,
          issuedAt: new Date(dto.issuedAt), dueDate: new Date(dto.dueDate),
          clientId: dto.clientId, jobId: dto.jobId, companyId,
        },
        include: this.includes,
      });
    });
    return this.mapInvoice(invoice);
  }

  async update(id: string, dto: UpdateInvoiceDto, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const existing = await this.prisma.invoice.findFirst({ where });
    if (!existing) throw new NotFoundException('Invoice not found');

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...dto,
        status: dto.status as any,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
      },
      include: this.includes,
    });
    return this.mapInvoice(invoice);
  }

  async export(id: string, companyId: string | null, userId: string) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const invoice = await this.prisma.invoice.findFirst({ where });
    if (!invoice) throw new NotFoundException('Invoice not found');

    this.audit.log({
      action: 'EXPORT_INVOICE', entity: 'invoice', entityId: id,
      userId, companyId: invoice.companyId,
    });

    // Placeholder: return invoice data for now
    return { message: 'Export placeholder', invoiceId: id, reference: invoice.reference };
  }

  // ─── PDF Generation ──────────────────────────────────────────────────────

  async generatePdf(invoiceId: string, companyId: string | null): Promise<{ buffer: Buffer; reference: string }> {
    const where: any = { id: invoiceId };
    if (companyId) where.companyId = companyId;

    const invoice = await this.prisma.invoice.findFirst({
      where,
      include: {
        client: true,
        job: { select: { reference: true } },
        company: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const amount = Number(invoice.amount);
    const tvaRate = 0.20;
    const tva = Math.round(amount * tvaRate * 100) / 100;
    const ttc = Math.round((amount + tva) * 100) / 100;

    const companyName = invoice.company.code === 'ASP' ? 'ASP Signalisation' : 'JS Concept';
    const companyAddress = invoice.company.code === 'ASP'
      ? 'ASP Signalisation\nSignalisation & Marquage routier'
      : 'JS Concept\nSignalisation & Aménagement';

    const formatDate = (d: Date) => d.toLocaleDateString('fr-FR');

    const fonts = {
      Roboto: {
        normal: require.resolve('pdfmake/build/vfs_fonts.js').replace('vfs_fonts.js', '../fonts/Roboto/Roboto-Regular.ttf'),
        bold: require.resolve('pdfmake/build/vfs_fonts.js').replace('vfs_fonts.js', '../fonts/Roboto/Roboto-Medium.ttf'),
        italics: require.resolve('pdfmake/build/vfs_fonts.js').replace('vfs_fonts.js', '../fonts/Roboto/Roboto-Italic.ttf'),
        bolditalics: require.resolve('pdfmake/build/vfs_fonts.js').replace('vfs_fonts.js', '../fonts/Roboto/Roboto-MediumItalic.ttf'),
      },
    };

    // Fallback: use Helvetica (built into PDF standard, no font files needed)
    const printer = new PdfPrinter({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    });

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      pageMargins: [40, 60, 40, 60],
      content: [
        // Company header
        { text: companyName, style: 'companyName' },
        { text: companyAddress, style: 'companyAddress', margin: [0, 0, 0, 20] },

        // Invoice title + reference
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'FACTURE', style: 'invoiceTitle' },
                { text: `Réf. : ${invoice.reference}`, style: 'invoiceRef' },
                { text: `Date : ${formatDate(invoice.issuedAt)}`, margin: [0, 2, 0, 0] },
                { text: `Échéance : ${formatDate(invoice.dueDate)}`, margin: [0, 2, 0, 0] },
              ],
            },
            {
              width: 200,
              stack: [
                { text: 'Client', bold: true, margin: [0, 0, 0, 4] },
                { text: invoice.client?.name ?? 'N/A' },
                { text: invoice.client?.address ?? '' },
                { text: `${invoice.client?.city ?? ''}` },
                { text: invoice.client?.email ?? '', color: '#666666', margin: [0, 4, 0, 0] },
              ],
            },
          ],
          margin: [0, 0, 0, 20] as [number, number, number, number],
        },

        // Job reference
        ...(invoice.job ? [{ text: `Chantier : ${invoice.job.reference}`, margin: [0, 0, 0, 15] as [number, number, number, number] }] : []),

        // Amount table
        {
          table: {
            headerRows: 1,
            widths: ['*', 120],
            body: [
              [
                { text: 'Désignation', bold: true, fillColor: '#f3f4f6' },
                { text: 'Montant', bold: true, alignment: 'right', fillColor: '#f3f4f6' },
              ],
              [
                'Prestation de services',
                { text: `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} \u20AC`, alignment: 'right' },
              ],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 15] as [number, number, number, number],
        },

        // Totals
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 220,
              table: {
                widths: ['*', 100],
                body: [
                  ['Total HT', { text: `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} \u20AC`, alignment: 'right' }],
                  ['TVA 20%', { text: `${tva.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} \u20AC`, alignment: 'right' }],
                  [
                    { text: 'Total TTC', bold: true, fontSize: 12 },
                    { text: `${ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} \u20AC`, alignment: 'right', bold: true, fontSize: 12 },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
          margin: [0, 0, 0, 30] as [number, number, number, number],
        },

        // Payment terms
        { text: 'Conditions de paiement', bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
        { text: `Paiement \u00E0 30 jours fin de mois. Date d'\u00E9ch\u00E9ance : ${formatDate(invoice.dueDate)}.`, color: '#444444' },
        { text: 'En cas de retard de paiement, des p\u00E9nalit\u00E9s de retard au taux de 3 fois le taux d\'int\u00E9r\u00EAt l\u00E9gal seront exigibles, ainsi qu\'une indemnit\u00E9 forfaitaire pour frais de recouvrement de 40\u20AC.', color: '#666666', fontSize: 8, margin: [0, 5, 0, 0] as [number, number, number, number] },
      ],
      styles: {
        companyName: { fontSize: 16, bold: true, color: '#1a1a1a' },
        companyAddress: { fontSize: 9, color: '#666666' },
        invoiceTitle: { fontSize: 20, bold: true, color: '#1a1a1a' },
        invoiceRef: { fontSize: 11, color: '#333333', margin: [0, 4, 0, 0] },
      },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve({ buffer: Buffer.concat(chunks), reference: invoice.reference }));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  // ─── CSV Export (FEC simplifié) ─────────────────────────────────────────────

  async exportCsv(from: string, to: string, companyId: string | null): Promise<string> {
    const where: any = {
      issuedAt: {
        gte: new Date(from),
        lte: new Date(to + 'T23:59:59.999Z'),
      },
      status: { in: ['sent', 'paid'] },
    };
    if (companyId) where.companyId = companyId;

    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: { issuedAt: 'asc' },
      include: {
        client: { select: { name: true } },
        company: { select: { code: true } },
      },
    });

    // FEC (Fichier des Ecritures Comptables) full 18-column format
    const headers = [
      'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
      'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
      'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
      'EcrtureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
    ];

    const lines: string[] = [headers.join(';')];

    const fmtDate = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}${m}${day}`;
    };

    const fmtAmount = (n: number): string => n.toFixed(2).replace('.', ',');

    for (const inv of invoices) {
      const amount = Number(inv.amount);
      const tva = Math.round(amount * 0.20 * 100) / 100;
      const ttc = Math.round((amount + tva) * 100) / 100;
      const dateStr = fmtDate(inv.issuedAt);
      const validDate = inv.paidAt ? fmtDate(inv.paidAt) : dateStr;
      const clientName = (inv as any).client?.name ?? '';

      // Line 1: Debit client account 411000 (TTC)
      lines.push([
        'VE', 'Journal des ventes', inv.reference, dateStr,
        '411000', 'Clients', '', clientName,
        inv.reference, dateStr,
        `Facture ${inv.reference}`,
        fmtAmount(ttc), fmtAmount(0),
        '', '', validDate, fmtAmount(ttc), 'EUR',
      ].join(';'));

      // Line 2: Credit services revenue 706000 (HT)
      lines.push([
        'VE', 'Journal des ventes', inv.reference, dateStr,
        '706000', 'Prestations de services', '', '',
        inv.reference, dateStr,
        `Facture ${inv.reference}`,
        fmtAmount(0), fmtAmount(amount),
        '', '', validDate, fmtAmount(amount), 'EUR',
      ].join(';'));

      // Line 3: Credit TVA collectee 445710 (TVA)
      lines.push([
        'VE', 'Journal des ventes', inv.reference, dateStr,
        '445710', 'TVA collectee', '', '',
        inv.reference, dateStr,
        `Facture ${inv.reference} TVA`,
        fmtAmount(0), fmtAmount(tva),
        '', '', validDate, fmtAmount(tva), 'EUR',
      ].join(';'));
    }

    return lines.join('\n');
  }

  // ─── Soft Delete ────────────────────────────────────────────────────────────

  async softDelete(id: string, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const invoice = await this.prisma.invoice.findFirst({ where });
    if (!invoice) throw new NotFoundException('Invoice not found');

    await this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  // ─── Situations (factures de situation) ────────────────────────────────────

  private mapSituation(s: any) {
    return {
      id: s.id,
      invoiceId: s.invoiceId,
      number: s.number,
      label: s.label,
      percentage: Number(s.percentage),
      amount: Number(s.amount),
      cumulativeAmount: Number(s.cumulativeAmount),
      description: s.description,
      status: s.status,
      date: s.date.toISOString(),
      createdAt: s.createdAt.toISOString(),
    };
  }

  async getSituations(invoiceId: string, companyId: string | null) {
    // Verify invoice exists and belongs to company
    const where: any = { id: invoiceId };
    if (companyId) where.companyId = companyId;
    const invoice = await this.prisma.invoice.findFirst({ where });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const situations = await this.prisma.invoiceSituation.findMany({
      where: { invoiceId },
      orderBy: { number: 'asc' },
    });
    return situations.map(this.mapSituation);
  }

  async createSituation(invoiceId: string, dto: CreateSituationDto, companyId: string) {
    // Verify invoice exists and belongs to company
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (dto.percentage <= 0 || dto.percentage > 100) {
      throw new BadRequestException('Le pourcentage doit être entre 0 et 100');
    }

    // Get previous situations to determine number and validate percentage
    const previousSituations = await this.prisma.invoiceSituation.findMany({
      where: { invoiceId },
      orderBy: { number: 'asc' },
    });

    const lastSituation = previousSituations[previousSituations.length - 1];
    const prevPercentage = lastSituation ? Number(lastSituation.percentage) : 0;
    const prevCumulative = lastSituation ? Number(lastSituation.cumulativeAmount) : 0;

    if (dto.percentage <= prevPercentage) {
      throw new BadRequestException(
        `Le pourcentage cumulé (${dto.percentage}%) doit être supérieur à la situation précédente (${prevPercentage}%)`,
      );
    }

    const nextNumber = previousSituations.length + 1;
    const invoiceAmount = Number(invoice.amount);
    const situationAmount = ((dto.percentage - prevPercentage) / 100) * invoiceAmount;
    const cumulativeAmount = prevCumulative + situationAmount;

    const label = `Situation n°${nextNumber} — ${dto.percentage}%`;

    const situation = await this.prisma.invoiceSituation.create({
      data: {
        id: createId(),
        invoiceId,
        number: nextNumber,
        label,
        percentage: dto.percentage,
        amount: Math.round(situationAmount * 100) / 100,
        cumulativeAmount: Math.round(cumulativeAmount * 100) / 100,
        description: dto.description ?? null,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });

    return this.mapSituation(situation);
  }

  async validateSituation(situationId: string, companyId: string | null) {
    const situation = await this.prisma.invoiceSituation.findFirst({
      where: { id: situationId },
      include: { invoice: true },
    });
    if (!situation) throw new NotFoundException('Situation not found');
    if (companyId && situation.invoice.companyId !== companyId) {
      throw new NotFoundException('Situation not found');
    }
    if (situation.status !== 'draft') {
      throw new BadRequestException('Seules les situations en brouillon peuvent être validées');
    }

    const updated = await this.prisma.invoiceSituation.update({
      where: { id: situationId },
      data: { status: 'validated' },
    });
    return this.mapSituation(updated);
  }
}
