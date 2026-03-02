import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAmendmentDto, UpdateAmendmentDto, UpdateAmendmentStatusDto } from './dto/create-amendment.dto';

@Injectable()
export class AmendmentsService {
  constructor(private prisma: PrismaService) {}

  private includes = {
    lines: { orderBy: { sortOrder: 'asc' as const } },
    quote: { select: { reference: true, status: true } },
  };

  private mapAmendment(a: any) {
    return {
      id: a.id,
      reference: a.reference,
      subject: a.subject,
      amount: Number(a.amount),
      status: a.status,
      quoteId: a.quoteId,
      quoteRef: a.quote?.reference ?? '',
      lines: (a.lines ?? []).map((l: any) => ({
        id: l.id,
        designation: l.designation,
        unit: l.unit,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        costPrice: Number(l.costPrice),
        sortOrder: l.sortOrder,
      })),
      createdAt: a.createdAt?.toISOString(),
      updatedAt: a.updatedAt?.toISOString(),
    };
  }

  async findByQuote(quoteId: string, companyId: string | null) {
    const where: any = { quoteId, deletedAt: null };
    if (companyId) where.companyId = companyId;
    const data = await this.prisma.quoteAmendment.findMany({
      where,
      include: this.includes,
      orderBy: { createdAt: 'asc' },
    });
    return data.map(this.mapAmendment);
  }

  async findOne(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;
    const amendment = await this.prisma.quoteAmendment.findFirst({
      where,
      include: this.includes,
    });
    if (!amendment) throw new NotFoundException('Amendment not found');
    return this.mapAmendment(amendment);
  }

  async create(quoteId: string, dto: CreateAmendmentDto, companyId: string) {
    // Verify quote exists and is accepted
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, companyId, deletedAt: null },
      include: { company: { select: { code: true } } },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== 'accepted') {
      throw new BadRequestException('Can only create amendments on accepted quotes');
    }

    // Generate reference: DEV-ASP-2026-001-AV1
    const existingCount = await this.prisma.quoteAmendment.count({ where: { quoteId } });
    const avNumber = existingCount + 1;
    const reference = `${quote.reference}-AV${avNumber}`;

    // Calculate amount from lines
    const lines = dto.lines ?? [];
    const amount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

    const amendment = await this.prisma.quoteAmendment.create({
      data: {
        reference,
        subject: dto.subject,
        amount,
        quoteId,
        companyId,
        lines: {
          create: lines.map((l, idx) => ({
            designation: l.designation,
            unit: l.unit ?? 'u',
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            costPrice: l.costPrice ?? 0,
            sortOrder: idx,
          })),
        },
      },
      include: this.includes,
    });

    // Activity log
    await this.prisma.activityLog.create({
      data: {
        entityId: quoteId,
        entityType: 'quote',
        action: 'AMENDMENT_CREATED',
        detail: `Avenant ${reference} créé (${amount.toFixed(2)} €)`,
        companyId,
      },
    });

    return this.mapAmendment(amendment);
  }

  async update(id: string, dto: UpdateAmendmentDto, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;
    const existing = await this.prisma.quoteAmendment.findFirst({ where });
    if (!existing) throw new NotFoundException('Amendment not found');
    if (existing.status !== 'draft') {
      throw new BadRequestException('Can only edit draft amendments');
    }

    // If lines are provided, replace all lines
    const lines = dto.lines;
    const amount = lines
      ? lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
      : undefined;

    const amendment = await this.prisma.quoteAmendment.update({
      where: { id },
      data: {
        subject: dto.subject,
        ...(amount !== undefined ? { amount } : {}),
        ...(lines
          ? {
              lines: {
                deleteMany: {},
                create: lines.map((l, idx) => ({
                  designation: l.designation,
                  unit: l.unit ?? 'u',
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  costPrice: l.costPrice ?? 0,
                  sortOrder: idx,
                })),
              },
            }
          : {}),
      },
      include: this.includes,
    });

    return this.mapAmendment(amendment);
  }

  async updateStatus(id: string, dto: UpdateAmendmentStatusDto, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;
    const existing = await this.prisma.quoteAmendment.findFirst({
      where,
      include: { quote: true },
    });
    if (!existing) throw new NotFoundException('Amendment not found');

    // Validate transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['sent'],
      sent: ['accepted', 'refused'],
    };
    if (!validTransitions[existing.status]?.includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${existing.status} to ${dto.status}`);
    }

    const amendment = await this.prisma.quoteAmendment.update({
      where: { id },
      data: { status: dto.status },
      include: this.includes,
    });

    // Activity log
    const statusLabels: Record<string, string> = { sent: 'envoyé', accepted: 'accepté', refused: 'refusé' };
    await this.prisma.activityLog.create({
      data: {
        entityId: existing.quoteId,
        entityType: 'quote',
        action: 'AMENDMENT_STATUS',
        detail: `Avenant ${existing.reference} ${statusLabels[dto.status] ?? dto.status}`,
        companyId: existing.companyId,
      },
    });

    return this.mapAmendment(amendment);
  }

  async remove(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;
    const existing = await this.prisma.quoteAmendment.findFirst({ where });
    if (!existing) throw new NotFoundException('Amendment not found');
    if (existing.status !== 'draft') {
      throw new BadRequestException('Can only delete draft amendments');
    }

    await this.prisma.quoteAmendment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }

  /**
   * Get total amount of accepted amendments for a quote
   */
  async getAcceptedTotal(quoteId: string): Promise<number> {
    const result = await this.prisma.quoteAmendment.aggregate({
      where: { quoteId, status: 'accepted', deletedAt: null },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }
}
