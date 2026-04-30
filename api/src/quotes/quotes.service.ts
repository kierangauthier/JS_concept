import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/create-quote.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
// See invoices.service.ts for why we go through pdfmake/js/Printer .default —
// the package's main entry isn't the printer constructor.
const PdfPrinter = require('pdfmake/js/Printer').default;
import { TDocumentDefinitions } from 'pdfmake/interfaces';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'expired'],
  sent: ['accepted', 'refused', 'expired'],
  accepted: ['expired'],
  refused: [],
  expired: [],
};

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private mapQuote(q: any) {
    return {
      id: q.id,
      reference: q.reference,
      clientId: q.clientId,
      clientName: q.client?.name ?? '',
      clientAddress: q.client?.address ?? '',
      subject: q.subject,
      amount: Number(q.amount),
      vatRate: q.vatRate != null ? Number(q.vatRate) : 20,
      status: q.status,
      company: q.company?.code ?? '',
      createdAt: q.createdAt.toISOString(),
      validUntil: q.validUntil.toISOString(),
    };
  }

  async findAll(companyId: string | null, pagination: PaginationDto) {
    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;
    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { name: true, address: true } },
          company: { select: { code: true } },
        },
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      data: data.map(this.mapQuote),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async findOne(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;

    const quote = await this.prisma.quote.findFirst({
      where,
      include: {
        client: { select: { name: true, address: true } },
        company: { select: { code: true } },
        lines: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!quote) throw new NotFoundException('Quote not found');

    return {
      ...this.mapQuote(quote),
      lines: quote.lines.map((l) => ({
        id: l.id,
        designation: l.designation,
        unit: l.unit,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        costPrice: Number(l.costPrice),
        sortOrder: l.sortOrder,
      })),
    };
  }

  async create(dto: CreateQuoteDto, companyId: string, userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    const year = new Date().getFullYear();

    // Backend is source of truth for amount — calculated from lines
    const amount = dto.lines?.length
      ? dto.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
      : dto.amount ?? 0;

    const quote = await this.prisma.$transaction(async (tx) => {
      // See invoices.service.ts for the rationale: Postgres disallows
      // FOR UPDATE on an aggregate; we serialise via a transaction-scoped
      // advisory lock keyed by companyId.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('quote-seq:' || ${companyId}))`;

      const result = await tx.$queryRaw<[{ next_val: bigint }]>`
        SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_val
        FROM "quotes"
        WHERE "companyId" = ${companyId}
      `;
      const nextVal = Number(result[0].next_val);
      const ref = `DEV-${company!.code}-${year}-${String(nextVal).padStart(3, '0')}`;

      const created = await tx.quote.create({
        data: {
          id: createId(),
          reference: ref,
          subject: dto.subject,
          amount,
          vatRate: dto.vatRate ?? 20,
          validUntil: new Date(dto.validUntil),
          clientId: dto.clientId,
          companyId,
          lines: dto.lines
            ? {
                create: dto.lines.map((l, i) => ({
                  designation: l.designation,
                  unit: l.unit,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  costPrice: l.costPrice ?? 0,
                  sortOrder: l.sortOrder ?? i,
                })),
              }
            : undefined,
        },
        include: {
          client: { select: { name: true } },
          company: { select: { code: true } },
          lines: true,
        },
      });

      return created;
    });

    const ref = quote.reference;
    await this.prisma.activityLog.create({
      data: {
        entityId: quote.id,
        entityType: 'quote',
        action: 'CREATED',
        detail: `Devis ${ref} créé`,
        companyId,
        userId,
      },
    });
    this.audit.log({
      action: 'CREATE',
      entity: 'quote',
      entityId: quote.id,
      after: { reference: ref, amount },
      companyId,
      userId,
    });

    return this.mapQuote(quote);
  }

  async update(
    id: string,
    dto: UpdateQuoteDto,
    companyId: string | null,
    userId: string,
  ) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;

    const existing = await this.prisma.quote.findFirst({ where });
    if (!existing) throw new NotFoundException('Quote not found');

    // Enforce valid status transitions
    if (dto.status && dto.status !== existing.status) {
      const allowed = VALID_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Transition ${existing.status}→${dto.status} non autorisée`,
        );
      }
    }

    // Calculate amount: from lines if provided, else from dto.amount, else leave unchanged (undefined)
    const amount = dto.lines
      ? dto.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
      : dto.amount;

    const quote = await this.prisma.$transaction(async (tx) => {
      if (dto.lines !== undefined) {
        // V1: delete + recreate all lines (line IDs change intentionally)
        await tx.quoteLine.deleteMany({ where: { quoteId: id } });
        if (dto.lines.length > 0) {
          await tx.quoteLine.createMany({
            data: dto.lines.map((l, i) => ({
              designation: l.designation,
              unit: l.unit,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              costPrice: l.costPrice ?? 0,
              sortOrder: l.sortOrder ?? i,
              quoteId: id,
            })),
          });
        }
      }

      return tx.quote.update({
        where: { id },
        data: {
          subject: dto.subject,
          amount: amount,
          vatRate: dto.vatRate,
          status: dto.status as any,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        },
        include: {
          client: { select: { name: true } },
          company: { select: { code: true } },
        },
      });
    });

    const action =
      dto.status && dto.status !== existing.status
        ? `STATUS_${dto.status.toUpperCase()}`
        : 'UPDATED';

    await this.prisma.activityLog.create({
      data: {
        entityId: id,
        entityType: 'quote',
        action,
        detail:
          dto.status && dto.status !== existing.status
            ? `Statut → ${dto.status}`
            : 'Devis mis à jour',
        companyId: quote.companyId,
        userId,
      },
    });
    this.audit.log({
      action,
      entity: 'quote',
      entityId: id,
      before: { status: existing.status, amount: Number(existing.amount) },
      after: { status: quote.status, amount: Number(quote.amount) },
      companyId,
      userId,
    });

    return this.mapQuote(quote);
  }

  async duplicate(id: string, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;

    const original = await this.prisma.quote.findFirst({
      where,
      include: { lines: true, company: true },
    });
    if (!original) throw new NotFoundException('Quote not found');

    const year = new Date().getFullYear();

    const quote = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('quote-seq:' || ${original.companyId}))`;

      const result = await tx.$queryRaw<[{ next_val: bigint }]>`
        SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_val
        FROM "quotes"
        WHERE "companyId" = ${original.companyId}
      `;
      const nextVal = Number(result[0].next_val);
      const ref = `DEV-${original.company.code}-${year}-${String(nextVal).padStart(3, '0')}`;

      return tx.quote.create({
        data: {
          id: createId(),
          reference: ref,
          subject: original.subject,
          amount: original.amount,
          status: 'draft',
          validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          clientId: original.clientId,
          companyId: original.companyId,
          lines: {
            create: original.lines.map((l) => ({
              designation: l.designation,
              unit: l.unit,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              costPrice: l.costPrice,
              sortOrder: l.sortOrder,
            })),
          },
        },
        include: {
          client: { select: { name: true } },
          company: { select: { code: true } },
        },
      });
    });

    return this.mapQuote(quote);
  }

  async convertToJob(
    id: string,
    companyId: string | null,
    userId: string,
    jobAddress?: string,
  ) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;

    const quote = await this.prisma.quote.findFirst({
      where,
      include: { client: true, company: true },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== 'accepted') {
      throw new BadRequestException(
        'Only accepted quotes can be converted to jobs',
      );
    }

    const year = new Date().getFullYear();

    const job = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('job-seq:' || ${quote.companyId}))`;

      const result = await tx.$queryRaw<[{ next_val: bigint }]>`
        SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_val
        FROM "jobs"
        WHERE "companyId" = ${quote.companyId}
      `;
      const nextVal = Number(result[0].next_val);
      const jobRef = `CHT-${quote.company.code}-${year}-${String(nextVal).padStart(3, '0')}`;

      return tx.job.create({
        data: {
          id: createId(),
          reference: jobRef,
          title: quote.subject,
          address: jobAddress?.trim() || quote.client.address,
          status: 'planned',
          startDate: new Date(),
          quoteId: quote.id,
          companyId: quote.companyId,
          clientId: quote.clientId,
        },
        include: {
          company: { select: { code: true } },
        },
      });
    });

    this.audit.log({
      action: 'CONVERT_TO_JOB',
      entity: 'quote',
      entityId: quote.id,
      after: { jobId: job.id, jobReference: job.reference },
      userId,
      companyId: quote.companyId,
    });

    return {
      id: job.id,
      reference: job.reference,
      title: job.title,
      address: job.address,
      status: job.status,
      company: job.company.code,
      startDate: job.startDate.toISOString(),
      endDate: null,
      progress: job.progress,
      quoteId: quote.id,
      clientName: quote.client.name,
      assignedTo: [],
    };
  }

  async convertFull(
    id: string,
    companyId: string | null,
    userId: string,
    options: { createWorkshop?: boolean; createPurchases?: boolean; jobAddress?: string },
  ) {
    // First convert to job (reuse existing logic)
    const job = await this.convertToJob(id, companyId, userId, options.jobAddress);

    const quote = await this.prisma.quote.findFirst({
      where: { id },
      include: { lines: true },
    });
    if (!quote) throw new NotFoundException('Quote not found');

    const workshopItems: any[] = [];
    const purchases: any[] = [];

    if (options.createWorkshop) {
      // Create workshop items for lines that look like fabrication
      for (const line of quote.lines) {
        // Check if line designation suggests workshop work
        const isWorkshop = line.designation.toLowerCase().match(
          /fabrication|soudure|atelier|peinture|usinage|montage/,
        );
        if (isWorkshop) {
          const item = await this.prisma.workshopItem.create({
            data: {
              id: createId(),
              reference: `AT-${job.reference.replace('CHT-', '')}`,
              title: line.designation,
              description: `Quantité : ${Number(line.quantity)}`,
              status: 'bat_pending',
              priority: 'medium',
              jobId: job.id,
              companyId: quote.companyId,
            },
          });
          workshopItems.push(item);
        }
      }
    }

    if (options.createPurchases) {
      // Disabled until `supplierId` and `orderedAt` are propagated by the caller —
      // `PurchaseOrder` requires both (see schema.prisma). The previous
      // implementation was type-unsafe and crashed at runtime (missing supplierId,
      // unknown `description` column). Surfaced here so the code is visible but inert.
      this.logger.warn(
        `[Quotes] createPurchases requested for quote ${quote.reference} but is disabled: caller must pass supplierId + orderedAt.`,
      );
    }

    return {
      job,
      workshopItems: workshopItems.map(w => ({
        id: w.id,
        reference: w.reference,
        description: w.description,
      })),
      purchases: purchases.map(p => ({
        id: p.id,
        reference: p.reference,
        amount: Number(p.amount),
      })),
    };
  }

  // ─── PDF Generation ──────────────────────────────────────────────────────

  async generatePdf(quoteId: string, companyId: string | null): Promise<{ buffer: Buffer; reference: string }> {
    const where: any = { id: quoteId, deletedAt: null };
    if (companyId) where.companyId = companyId;

    const quote = await this.prisma.quote.findFirst({
      where,
      include: {
        client: true,
        company: true,
        lines: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!quote) throw new NotFoundException('Quote not found');

    const amount = Number(quote.amount);
    const vatRatePercent = quote.vatRate != null ? Number(quote.vatRate) : 20;
    const tva = Math.round(amount * (vatRatePercent / 100) * 100) / 100;
    const ttc = Math.round((amount + tva) * 100) / 100;
    // Display rate: drop trailing zeros, use comma separator (5,5 not 5.50)
    const vatLabel = `TVA ${vatRatePercent.toString().replace('.', ',').replace(/,00?$/, '')}%`;

    // Read full legal info populated via /admin/legal (PR #34a).
    const c: any = quote.company;
    const companyName = c.legalName ?? (c.code === 'ASP' ? 'ASP Signalisation' : 'JS Concept');
    const companyTagline = c.tagline ?? (c.code === 'ASP' ? 'Signalisation & Marquage routier' : 'Signalisation & Aménagement');
    const companyAddrLines = [
      c.addressLine1,
      c.addressLine2,
      [c.postalCode, c.city].filter(Boolean).join(' '),
    ].filter((l) => l && String(l).trim().length > 0);
    const companyContactBits = [c.phone, c.email, c.website].filter((s) => s && String(s).trim().length > 0);

    const formatDate = (d: Date) => d.toLocaleDateString('fr-FR');
    // Manual fr-FR formatter: toLocaleString emits a thin non-breaking space
    // (U+202F) as the thousands separator that Helvetica/Roboto can't render
    // (shows up as '/'). We rebuild the format with an ASCII space.
    const fmtPrice = (n: number): string => {
      const fixed = n.toFixed(2);
      const [intPart, decPart] = fixed.split('.');
      const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return `${withSpaces},${decPart}`;
    };

    // Per-page legal footer — required for French invoicing/quoting compliance.
    const buildLegalFooter = (): string => {
      const parts: string[] = [];
      const head: string[] = [];
      head.push(companyName);
      if (c.legalForm) head.push(c.legalForm);
      if (c.shareCapital != null) head.push(`au capital de ${fmtPrice(Number(c.shareCapital))} €`);
      parts.push(head.join(' '));
      if (companyAddrLines.length) parts.push(`Siège : ${companyAddrLines.join(', ')}`);
      const ids: string[] = [];
      if (c.siret) ids.push(`SIRET ${c.siret}`);
      if (c.rcsCity) ids.push(`RCS ${c.rcsCity}${c.siren ? ' B ' + c.siren : ''}`);
      if (c.apeCode) ids.push(`APE ${c.apeCode}`);
      if (c.vatNumber) ids.push(`TVA ${c.vatNumber}`);
      if (ids.length) parts.push(ids.join(' · '));
      return parts.join('\n');
    };
    const legalFooter = buildLegalFooter();

    const printer = new PdfPrinter({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    });

    // Build lines table
    const linesBody: any[][] = [
      [
        { text: 'Désignation', bold: true, fillColor: '#f3f4f6' },
        { text: 'Unité', bold: true, fillColor: '#f3f4f6', alignment: 'center' },
        { text: 'Qté', bold: true, fillColor: '#f3f4f6', alignment: 'right' },
        { text: 'P.U. HT', bold: true, fillColor: '#f3f4f6', alignment: 'right' },
        { text: 'Total HT', bold: true, fillColor: '#f3f4f6', alignment: 'right' },
      ],
    ];

    for (const line of quote.lines) {
      const qty = Number(line.quantity);
      const up = Number(line.unitPrice);
      const total = qty * up;
      linesBody.push([
        line.designation,
        { text: line.unit, alignment: 'center' },
        { text: fmtPrice(qty), alignment: 'right' },
        { text: `${fmtPrice(up)} €`, alignment: 'right' },
        { text: `${fmtPrice(total)} €`, alignment: 'right' },
      ]);
    }

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      // Bottom margin extended to leave room for the legal footer.
      pageMargins: [40, 60, 40, 90],
      footer: (currentPage: number, pageCount: number) => ({
        margin: [40, 0, 40, 20],
        columns: [
          { text: legalFooter, style: 'footerLegal', width: '*' },
          { text: `Page ${currentPage} / ${pageCount}`, style: 'footerPage', alignment: 'right', width: 70 },
        ],
      }),
      content: [
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: companyName, style: 'companyName' },
                { text: companyTagline, style: 'companyAddress' },
                ...companyAddrLines.map((l) => ({ text: l, style: 'companyAddress' })),
                ...(companyContactBits.length
                  ? [{ text: companyContactBits.join(' · '), style: 'companyAddress', margin: [0, 4, 0, 0] as [number, number, number, number] }]
                  : []),
              ],
            },
          ],
          margin: [0, 0, 0, 20] as [number, number, number, number],
        },

        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'DEVIS', style: 'invoiceTitle' },
                { text: `Réf. : ${quote.reference}`, style: 'invoiceRef' },
                { text: `Date : ${formatDate(quote.createdAt)}`, margin: [0, 2, 0, 0] },
                { text: `Validité : ${formatDate(quote.validUntil)}`, margin: [0, 2, 0, 0] },
              ],
            },
            {
              width: 200,
              stack: [
                { text: 'Client', bold: true, margin: [0, 0, 0, 4] },
                { text: quote.client?.name ?? 'N/A' },
                { text: quote.client?.address ?? '' },
                { text: [quote.client?.postalCode, quote.client?.city].filter(Boolean).join(' ') },
                ...(quote.client?.siret
                  ? [{ text: `SIRET ${quote.client.siret}`, color: '#666666', fontSize: 9 }]
                  : []),
                { text: quote.client?.email ?? '', color: '#666666', margin: [0, 4, 0, 0] as [number, number, number, number] },
              ],
            },
          ],
          margin: [0, 0, 0, 10] as [number, number, number, number],
        },

        { text: `Objet : ${quote.subject}`, bold: true, margin: [0, 0, 0, 15] as [number, number, number, number] },

        // Lines table
        {
          table: {
            headerRows: 1,
            widths: ['*', 50, 50, 80, 80],
            body: linesBody,
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
                  ['Total HT', { text: `${fmtPrice(amount)} €`, alignment: 'right' }],
                  [vatLabel, { text: `${fmtPrice(tva)} €`, alignment: 'right' }],
                  [
                    { text: 'Total TTC', bold: true, fontSize: 12 },
                    { text: `${fmtPrice(ttc)} €`, alignment: 'right', bold: true, fontSize: 12 },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
          margin: [0, 0, 0, 30] as [number, number, number, number],
        },

        // Conditions
        { text: 'Conditions', bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
        { text: `Ce devis est valable jusqu'au ${formatDate(quote.validUntil)}.`, color: '#444444' },
        { text: 'Bon pour accord – Date et signature du client :', color: '#444444', margin: [0, 10, 0, 0] as [number, number, number, number] },
        { text: '\n\n\n', },
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#999999' }],
          margin: [0, 0, 0, 5] as [number, number, number, number],
        },
        { text: 'Signature client', color: '#999999', fontSize: 8 },
      ],
      styles: {
        companyName: { fontSize: 16, bold: true, color: '#1a1a1a' },
        companyAddress: { fontSize: 9, color: '#666666' },
        invoiceTitle: { fontSize: 20, bold: true, color: '#1a1a1a' },
        invoiceRef: { fontSize: 11, color: '#333333', margin: [0, 4, 0, 0] },
        footerLegal: { fontSize: 7, color: '#666666' },
        footerPage: { fontSize: 7, color: '#999999' },
      },
    };

    // pdfmake 0.3.x returns a Promise that resolves to the PDFKit document.
    const pdfDoc: any = await printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve({ buffer: Buffer.concat(chunks), reference: quote.reference }));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  async softDelete(id: string, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const quote = await this.prisma.quote.findFirst({ where });
    if (!quote) throw new NotFoundException('Quote not found');

    await this.prisma.quote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }
}
