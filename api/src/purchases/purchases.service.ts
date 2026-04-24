import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto, UpdatePurchaseDto } from './dto/create-purchase.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private mapPurchase(p: any) {
    return {
      id: p.id,
      reference: p.reference,
      supplierId: p.supplierId,
      supplierName: p.supplier?.name ?? '',
      jobId: p.jobId,
      jobRef: p.job?.reference ?? null,
      amount: Number(p.amount),
      status: p.status,
      company: p.company?.code ?? '',
      orderedAt: p.orderedAt.toISOString(),
    };
  }

  private includes = {
    supplier: { select: { name: true } },
    job: { select: { reference: true } },
    company: { select: { code: true } },
  };

  async findAll(companyId: string | null, pagination: PaginationDto) {
    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where, skip: pagination.skip, take: pagination.limit,
        orderBy: { createdAt: 'desc' }, include: this.includes,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data: data.map(this.mapPurchase), total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;
    const po = await this.prisma.purchaseOrder.findFirst({ where, include: this.includes });
    if (!po) throw new NotFoundException('Purchase order not found');
    return this.mapPurchase(po);
  }

  async create(dto: CreatePurchaseDto, companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const year = new Date().getFullYear();

    const po = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('purchase-seq:' || ${companyId}))`;

      const result = await tx.$queryRaw<[{ next_val: bigint }]>`
        SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_val
        FROM "purchase_orders"
        WHERE "companyId" = ${companyId}
      `;
      const nextVal = Number(result[0].next_val);
      const ref = `CMD-${company!.code}-${year}-${String(nextVal).padStart(3, '0')}`;

      return tx.purchaseOrder.create({
        data: {
          id: createId(), reference: ref, amount: dto.amount,
          orderedAt: new Date(dto.orderedAt), supplierId: dto.supplierId,
          jobId: dto.jobId, companyId,
        },
        include: this.includes,
      });
    });
    return this.mapPurchase(po);
  }

  async markOrdered(id: string, companyId: string | null, userId: string) {
    return this.transition(id, companyId, 'draft', 'ordered', userId, 'MARK_ORDERED');
  }

  async markReceived(id: string, companyId: string | null, userId: string) {
    return this.transition(id, companyId, 'ordered', 'received', userId, 'MARK_RECEIVED');
  }

  private async transition(
    id: string, companyId: string | null,
    fromStatus: string, toStatus: string,
    userId: string, action: string,
  ) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const po = await this.prisma.purchaseOrder.findFirst({ where, include: this.includes });
    if (!po) throw new NotFoundException('Purchase order not found');

    // Allow partial → received as well
    if (po.status !== fromStatus && !(fromStatus === 'ordered' && po.status === 'partial')) {
      throw new BadRequestException(`Cannot transition from ${po.status} to ${toStatus}`);
    }

    const updateData: any = { status: toStatus as any };
    if (toStatus === 'received') {
      updateData.receivedAt = new Date();
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id }, data: updateData, include: this.includes,
    });

    this.audit.log({
      action, entity: 'purchase_order', entityId: id,
      before: { status: po.status }, after: { status: toStatus },
      userId, companyId: po.companyId,
    });

    return this.mapPurchase(updated);
  }

  async softDelete(id: string, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const po = await this.prisma.purchaseOrder.findFirst({ where });
    if (!po) throw new NotFoundException('Purchase order not found');

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }
}
