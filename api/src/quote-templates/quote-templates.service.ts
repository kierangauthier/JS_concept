import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFromQuoteDto, CreateQuoteFromTemplateDto } from './dto/quote-template.dto';

@Injectable()
export class QuoteTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.quoteTemplate.findMany({
      where: { companyId },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { lines: true } },
      },
      orderBy: { usageCount: 'desc' },
    });
  }

  async createFromQuote(dto: CreateFromQuoteDto, companyId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: dto.quoteId, companyId },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!quote) throw new NotFoundException('Quote not found');

    return this.prisma.quoteTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        companyId,
        lines: {
          create: quote.lines.map((l, i) => ({
            designation: l.designation,
            unit: l.unit,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            costPrice: l.costPrice,
            sortOrder: i,
          })),
        },
      },
      include: { lines: true },
    });
  }

  async createQuoteFromTemplate(
    templateId: string,
    dto: CreateQuoteFromTemplateDto,
    companyId: string,
  ) {
    const template = await this.prisma.quoteTemplate.findFirst({
      where: { id: templateId, companyId },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) throw new NotFoundException('Template not found');

    // Calculate total amount from template lines
    const amount = template.lines.reduce(
      (sum, l) => sum + Number(l.quantity) * Number(l.unitPrice),
      0,
    );

    // Generate reference
    const year = new Date().getFullYear();
    const companyCode = companyId.slice(0, 3).toUpperCase();
    const count = await this.prisma.quote.count({ where: { companyId } });
    const ref = `DEV-${companyCode}-${year}-${String(count + 1).padStart(3, '0')}`;

    const quote = await this.prisma.quote.create({
      data: {
        id: ref,
        reference: ref,
        subject: dto.subject,
        amount,
        validUntil: new Date(dto.validUntil),
        clientId: dto.clientId,
        companyId,
        lines: {
          create: template.lines.map((l, i) => ({
            designation: l.designation,
            unit: l.unit,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            costPrice: l.costPrice,
            sortOrder: i,
          })),
        },
      },
      include: { lines: true, client: { select: { name: true } } },
    });

    // Increment usage count
    await this.prisma.quoteTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    return quote;
  }

  async remove(id: string, companyId: string) {
    const template = await this.prisma.quoteTemplate.findFirst({
      where: { id, companyId },
    });
    if (!template) throw new NotFoundException('Template not found');
    await this.prisma.quoteTemplate.delete({ where: { id } });
    return { deleted: true };
  }
}
