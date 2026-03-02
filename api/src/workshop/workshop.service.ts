import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkshopItemDto, UpdateWorkshopItemDto } from './dto/create-workshop-item.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { WorkshopStatus } from '@prisma/client';

// Ordered steps for next-step transitions
const WORKSHOP_FLOW: WorkshopStatus[] = [
  'bat_pending', 'bat_approved', 'fabrication', 'ready', 'pose_planned', 'pose_done',
];

@Injectable()
export class WorkshopService {
  constructor(private prisma: PrismaService) {}

  private mapItem(w: any) {
    return {
      id: w.id,
      reference: w.reference,
      title: w.title,
      description: w.description,
      status: w.status,
      priority: w.priority,
      dueDate: w.dueDate?.toISOString() ?? null,
      assignedTo: w.assignedTo,
      jobId: w.jobId,
      jobRef: w.job?.reference ?? '',
      company: w.company?.code ?? '',
    };
  }

  private includes = {
    job: { select: { reference: true } },
    company: { select: { code: true } },
  };

  async findAll(companyId: string | null, pagination: PaginationDto) {
    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;
    const [data, total] = await Promise.all([
      this.prisma.workshopItem.findMany({
        where, skip: pagination.skip, take: pagination.limit,
        orderBy: { createdAt: 'desc' }, include: this.includes,
      }),
      this.prisma.workshopItem.count({ where }),
    ]);
    return { data: data.map(this.mapItem), total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;
    const item = await this.prisma.workshopItem.findFirst({ where, include: this.includes });
    if (!item) throw new NotFoundException('Workshop item not found');
    return this.mapItem(item);
  }

  async create(dto: CreateWorkshopItemDto, companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });

    const item = await this.prisma.$transaction(async (tx) => {
      const result = await tx.$queryRaw<[{ next_val: bigint }]>`
        SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_val
        FROM "workshop_items"
        WHERE "companyId" = ${companyId}
        FOR UPDATE
      `;
      const nextVal = Number(result[0].next_val);
      const ref = `ATL-${company!.code}-${String(nextVal).padStart(3, '0')}`;

      return tx.workshopItem.create({
        data: {
          reference: ref,
          title: dto.title,
          description: dto.description ?? '',
          jobId: dto.jobId,
          companyId,
          priority: (dto.priority as any) ?? 'medium',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          assignedTo: dto.assignedTo,
        },
        include: this.includes,
      });
    });
    return this.mapItem(item);
  }

  async update(id: string, dto: UpdateWorkshopItemDto, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const existing = await this.prisma.workshopItem.findFirst({ where });
    if (!existing) throw new NotFoundException('Workshop item not found');

    const item = await this.prisma.workshopItem.update({
      where: { id },
      data: {
        ...dto,
        priority: dto.priority as any,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: this.includes,
    });
    return this.mapItem(item);
  }

  async softDelete(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;
    const item = await this.prisma.workshopItem.findFirst({ where });
    if (!item) throw new NotFoundException('Workshop item not found');

    await this.prisma.workshopItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async nextStep(id: string, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const item = await this.prisma.workshopItem.findFirst({ where, include: this.includes });
    if (!item) throw new NotFoundException('Workshop item not found');

    const currentIndex = WORKSHOP_FLOW.indexOf(item.status);
    if (currentIndex === -1 || currentIndex >= WORKSHOP_FLOW.length - 1) {
      throw new BadRequestException(`Cannot advance from status ${item.status}`);
    }

    const nextStatus = WORKSHOP_FLOW[currentIndex + 1];
    const updated = await this.prisma.workshopItem.update({
      where: { id }, data: { status: nextStatus }, include: this.includes,
    });
    return this.mapItem(updated);
  }
}
