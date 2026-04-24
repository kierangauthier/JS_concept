import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, UpdateInvoiceDto, CreateSituationDto } from './dto/create-invoice.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';
import { InvoiceIntegrityService } from './invoice-integrity.service';
import { generateFacturXXml, pickBestProfile, FacturXInvoice, FacturXProfile, FacturXLine } from './facturx.generator';
import { FacturXPdfService } from './facturx-pdf.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');
import { TDocumentDefinitions } from 'pdfmake/interfaces';

/**
 * Fields that may mutate at any time (administrative / operational).
 * Everything NOT listed here is frozen once the invoice leaves `draft`.
 */
const MUTABLE_AFTER_ISSUE = new Set<keyof UpdateInvoiceDto>(['status', 'paidAt']);

/** Allowed status transitions — enforced in addition to the field freeze. */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private integrity: InvoiceIntegrityService,
    private facturxPdf: FacturXPdfService,
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
      integrityHash: i.integrityHash ?? null,
      integrityHashAt: i.integrityHashAt?.toISOString() ?? null,
    };
  }

  /** Re-computes the integrity hash and returns the verdict. */
  private async verifyPersistedIntegrity(invoice: any): Promise<{ ok: boolean; sealed: boolean }> {
    if (!invoice.integrityHash) return { ok: true, sealed: false };
    const { ok } = this.integrity.verify(invoice, invoice.integrityHash);
    if (!ok) {
      this.audit.log({
        action: 'INVOICE_INTEGRITY_MISMATCH',
        entity: 'invoice',
        entityId: invoice.id,
        companyId: invoice.companyId,
      });
    }
    return { ok, sealed: true };
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
      // Serialise the sequential numbering per company via a transaction-scoped
      // advisory lock. Postgres does NOT allow `FOR UPDATE` with aggregates
      // (`MAX()`) — 0A000 error — so we rely on pg_advisory_xact_lock which
      // auto-releases at commit/rollback. Same company acquires the same lock
      // key, other companies advance in parallel without contention.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('invoice-seq:' || ${companyId}))`;

      const result = await tx.$queryRaw<[{ next_val: bigint }]>`
        SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_val
        FROM "invoices"
        WHERE "companyId" = ${companyId}
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

    const wasDraft = existing.status === 'draft';

    // ─── Enforce immutability once the invoice has left `draft` ───────────
    if (!wasDraft) {
      const touched = Object.keys(dto).filter((k) => (dto as any)[k] !== undefined);
      const forbidden = touched.filter((k) => !MUTABLE_AFTER_ISSUE.has(k as any));
      if (forbidden.length > 0) {
        throw new ForbiddenException({
          message:
            'Facture émise : seules les transitions de statut et la date de paiement sont modifiables. Pour corriger le montant, émettre un avoir.',
          frozenFields: forbidden,
        });
      }
    }

    // ─── Enforce allowed status transitions ───────────────────────────────
    if (dto.status && dto.status !== existing.status) {
      const allowed = STATUS_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new ForbiddenException(
          `Transition interdite : ${existing.status} → ${dto.status}`,
        );
      }
    }

    const data: any = {
      ...dto,
      status: dto.status as any,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
    };

    // ─── Seal the invoice the moment it leaves `draft` ────────────────────
    const leavingDraft = wasDraft && dto.status && dto.status !== 'draft';
    if (leavingDraft && !existing.integrityHash) {
      const sealNow = new Date();
      // Compute the hash against the FUTURE shape of the row.
      const projected = {
        id: existing.id,
        reference: existing.reference,
        amount: existing.amount,
        vatRate: existing.vatRate,
        issuedAt: existing.issuedAt,
        dueDate: data.dueDate ?? existing.dueDate,
        clientId: existing.clientId,
        jobId: existing.jobId,
        companyId: existing.companyId,
      };
      data.integrityHash = this.integrity.compute(projected);
      data.integrityHashAt = sealNow;
    }

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data,
      include: this.includes,
    });

    this.audit.log({
      action: leavingDraft ? 'INVOICE_ISSUED' : 'INVOICE_UPDATE',
      entity: 'invoice',
      entityId: id,
      before: { status: existing.status },
      after: { status: dto.status ?? existing.status, integrityHash: data.integrityHash ?? existing.integrityHash ?? null },
      companyId: existing.companyId,
    });

    return this.mapInvoice(invoice);
  }

  /**
   * Expose the integrity check to the controller.
   * Returns `{ sealed: boolean, ok: boolean, expected?: string }`.
   */
  async checkIntegrity(id: string, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const invoice = await this.prisma.invoice.findFirst({ where });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const verdict = this.integrity.verify(invoice, invoice.integrityHash ?? null);
    return {
      sealed: !!invoice.integrityHash,
      sealedAt: invoice.integrityHashAt?.toISOString() ?? null,
      ok: invoice.integrityHash ? verdict.ok : true,
    };
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
    const tvaRate = invoice.vatRate != null ? Number(invoice.vatRate) / 100 : 0.2;
    const tva = Math.round(amount * tvaRate * 100) / 100;
    const ttc = Math.round((amount + tva) * 100) / 100;

    const c = invoice.company as any;
    const companyName = c.legalName ?? c.name;
    const addrLines = [c.addressLine1, c.addressLine2, [c.postalCode, c.city].filter(Boolean).join(' ')]
      .filter((l) => l && String(l).trim().length > 0);
    const companyAddress = addrLines.length > 0 ? addrLines.join('\n') : c.name;

    const lateRate = c.latePaymentRate ?? '3 × taux d\'intérêt légal';
    const lateFee = c.lateFeeFlat != null ? Number(c.lateFeeFlat) : 40;
    const paymentTermsText =
      c.paymentTerms ?? 'Paiement à 30 jours fin de mois';

    const legalMentions: string[] = [];
    if (c.legalForm && c.shareCapital != null)
      legalMentions.push(`${c.legalForm} au capital de ${Number(c.shareCapital).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`);
    else if (c.legalForm) legalMentions.push(String(c.legalForm));
    if (c.siret) legalMentions.push(`SIRET ${c.siret}`);
    else if (c.siren) legalMentions.push(`SIREN ${c.siren}`);
    if (c.rcsCity) legalMentions.push(`RCS ${c.rcsCity}`);
    if (c.vatNumber) legalMentions.push(`TVA ${c.vatNumber}`);
    const legalFooter = legalMentions.join(' — ');

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
        { text: `${paymentTermsText}. Date d'échéance : ${formatDate(invoice.dueDate)}.`, color: '#444444' },
        ...(c.iban
          ? [{
              text: `IBAN : ${c.iban}${c.bic ? `  —  BIC : ${c.bic}` : ''}`,
              color: '#444444',
              margin: [0, 4, 0, 0] as [number, number, number, number],
            }]
          : []),
        {
          text:
            `En cas de retard de paiement, des pénalités de retard au taux de ${lateRate} seront exigibles, ` +
            `ainsi qu'une indemnité forfaitaire pour frais de recouvrement de ${lateFee}€ (art. D.441-5 Code de commerce).`,
          color: '#666666', fontSize: 8, margin: [0, 5, 0, 0] as [number, number, number, number],
        },
        ...(legalFooter
          ? [{
              text: legalFooter,
              color: '#888888', fontSize: 7, alignment: 'center' as const,
              margin: [0, 20, 0, 0] as [number, number, number, number],
            }]
          : []),
        ...((invoice as any).integrityHash
          ? [{
              text: `Sceau d'intégrité (HMAC-SHA256) : ${String((invoice as any).integrityHash).slice(0, 32)}…`,
              color: '#aaaaaa', fontSize: 6, alignment: 'center' as const,
              margin: [0, 2, 0, 0] as [number, number, number, number],
            }]
          : []),
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

  // ─── Factur-X (multi-profil, PDF/A-3 hybride) ──────────────────────────────

  /**
   * Builds the Factur-X payload from the stored invoice.
   *
   * - Pulls the company legal fields and the client address.
   * - Maps invoice lines (from the related `Quote`) when available — this
   *   lets the generator emit BASIC / EN 16931 instead of MINIMUM.
   * - Checks the mandatory legal mentions. If any are missing the caller
   *   gets an UnprocessableEntity with the list, rather than a silently
   *   degraded XML.
   */
  private async buildFacturXPayload(
    invoiceId: string,
    companyId: string | null,
  ): Promise<{ payload: FacturXInvoice; profile: FacturXProfile; invoiceRecord: any }> {
    const where: any = { id: invoiceId };
    if (companyId) where.companyId = companyId;

    const invoice = await this.prisma.invoice.findFirst({
      where,
      include: {
        client: true,
        company: true,
        // The quote carries the detailed lines we need for BASIC / EN16931.
        job: { include: { quote: { include: { lines: { orderBy: { sortOrder: 'asc' } } } } } },
      },
    }) as any;
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'draft') {
      throw new BadRequestException(
        'Le Factur-X ne peut être produit que pour une facture émise.',
      );
    }

    const c = invoice.company as any;

    // ── Fail-fast on missing legal mentions ────────────────────────────
    const missing: string[] = [];
    if (!c.legalName && !c.name) missing.push('company.legalName');
    if (!c.siret && !c.siren) missing.push('company.siret ou company.siren');
    if (!c.vatNumber) missing.push('company.vatNumber (TVA intracommunautaire)');
    if (!c.addressLine1) missing.push('company.addressLine1');
    if (!c.postalCode) missing.push('company.postalCode');
    if (!c.city) missing.push('company.city');
    if (!invoice.client?.name) missing.push('client.name');

    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        message:
          'Facture-X indisponible : champs légaux manquants. Complétez-les dans Admin → Paramètres puis réessayez.',
        missing,
      });
    }

    // ── Totals ─────────────────────────────────────────────────────────
    const amountHT = Number(invoice.amount);
    const vatRate = invoice.vatRate != null ? Number(invoice.vatRate) / 100 : 0.2;
    const tva = Math.round(amountHT * vatRate * 100) / 100;
    const ttc = Math.round((amountHT + tva) * 100) / 100;

    // ── Line items (only when present — falls back to MINIMUM otherwise) ─
    const quoteLines = invoice.job?.quote?.lines as Array<any> | undefined;
    const lines: FacturXLine[] | undefined = quoteLines?.length
      ? quoteLines.map((l) => {
          const qty = Number(l.quantity ?? 1);
          const unitPrice = Number(l.unitPrice ?? 0);
          return {
            designation: l.designation ?? 'Prestation',
            quantity: qty,
            unit: mapUnit(l.unit),
            unitPrice,
            vatRate: vatRate * 100,
            totalHT: Math.round(qty * unitPrice * 100) / 100,
          };
        })
      : undefined;

    const payload: FacturXInvoice = {
      reference: invoice.reference,
      issuedAt: invoice.issuedAt,
      dueDate: invoice.dueDate,
      vatMode: 'normal',
      seller: {
        name: c.legalName ?? c.name,
        address: c.addressLine1 ?? undefined,
        postalCode: c.postalCode ?? undefined,
        city: c.city ?? undefined,
        countryCode: c.countryCode ?? 'FR',
        vatNumber: c.vatNumber ?? undefined,
        siret: c.siret ?? c.siren ?? undefined,
        legalForm: c.legalForm ?? undefined,
      },
      buyer: {
        name: invoice.client!.name,
        address: invoice.client?.address ?? undefined,
        city: invoice.client?.city ?? undefined,
        countryCode: 'FR',
      },
      totalHT: amountHT,
      totalTVA: tva,
      totalTTC: ttc,
      lines,
      paymentTerms: c.paymentTerms ?? 'Paiement à 30 jours fin de mois',
      iban: c.iban ?? undefined,
      bic: c.bic ?? undefined,
    };

    const profile = pickBestProfile(payload, 'EN16931');
    return { payload, profile, invoiceRecord: invoice };
  }

  /**
   * Returns the Factur-X CII XML on its own. Mostly kept for debugging and
   * for PDPs that prefer to ingest the XML directly rather than the hybrid
   * PDF — the front-end always calls the PDF endpoint.
   */
  async generateFacturXXml(
    invoiceId: string,
    companyId: string | null,
  ): Promise<{ xml: string; reference: string; profile: FacturXProfile }> {
    const { payload, profile, invoiceRecord } = await this.buildFacturXPayload(invoiceId, companyId);
    return {
      xml: generateFacturXXml(payload, profile),
      reference: invoiceRecord.reference,
      profile,
    };
  }

  /**
   * Produces the full hybrid deliverable: a PDF/A-3 with the Factur-X XML
   * embedded. This is the artefact that client accounting software (Sage,
   * EBP, Cegid, Pennylane…) expect.
   */
  async generateFacturXPdf(
    invoiceId: string,
    companyId: string | null,
  ): Promise<{ buffer: Buffer; reference: string; profile: FacturXProfile }> {
    const { payload, profile, invoiceRecord } = await this.buildFacturXPayload(invoiceId, companyId);
    const xml = generateFacturXXml(payload, profile);

    // Produce the visual PDF via the regular pdfmake pipeline.
    const { buffer: basePdf } = await this.generatePdf(invoiceRecord.id, companyId);

    // Convert to PDF/A-3 and embed the XML.
    const hybrid = await this.facturxPdf.build({
      pdf: basePdf,
      xml,
      profile,
      invoiceReference: invoiceRecord.reference,
    });

    return { buffer: hybrid, reference: invoiceRecord.reference, profile };
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

    // An issued invoice must not be deleted — French commercial law requires
    // 10-year retention of the original document. Use an AVOIR (credit note)
    // to offset it instead.
    if (invoice.status !== 'draft') {
      throw new ForbiddenException(
        'Une facture émise ne peut pas être supprimée. Émettre un avoir pour la neutraliser.',
      );
    }

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

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map an app-level unit string to a UNECE Rec. 20 unit code, which is what
 * Factur-X (CII) expects. Falls back to C62 ("one / piece") for unknown or
 * free-text units — this is the safe default accepted by every validator.
 */
function mapUnit(unit?: string | null): string {
  if (!unit) return 'C62';
  const normalized = unit.trim().toLowerCase();
  switch (normalized) {
    case 'u':
    case 'unit':
    case 'unite':
    case 'unité':
    case 'pièce':
    case 'piece':
    case 'pce':
      return 'C62';
    case 'h':
    case 'heure':
    case 'heures':
    case 'hour':
      return 'HUR';
    case 'jour':
    case 'jours':
    case 'j':
    case 'day':
      return 'DAY';
    case 'kg':
    case 'kilo':
    case 'kilogramme':
      return 'KGM';
    case 'g':
    case 'gramme':
      return 'GRM';
    case 't':
    case 'tonne':
      return 'TNE';
    case 'm':
    case 'metre':
    case 'mètre':
      return 'MTR';
    case 'm2':
    case 'm²':
      return 'MTK';
    case 'm3':
    case 'm³':
      return 'MTQ';
    case 'l':
    case 'litre':
      return 'LTR';
    case 'ft':
    case 'forfait':
      return 'LS'; // lump sum
    default:
      return 'C62';
  }
}
