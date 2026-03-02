import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanningSlotDto, BulkCreatePlanningSlotDto } from './dto/planning-slot.dto';

@Injectable()
export class PlanningService {
  constructor(private prisma: PrismaService) {}

  private includes = {
    user: { select: { id: true, name: true } },
    job: { select: { id: true, reference: true, title: true } },
    company: { select: { code: true } },
  };

  private mapSlot(s: any) {
    return {
      id: s.id,
      date: s.date.toISOString(),
      userId: s.userId,
      userName: s.user?.name ?? '',
      jobId: s.jobId,
      jobRef: s.job?.reference ?? '',
      jobTitle: s.job?.title ?? '',
      company: s.company?.code ?? '',
      note: s.note ?? null,
    };
  }

  async findByWeek(companyId: string | null, startDate: string, endDate: string) {
    const where: any = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };
    if (companyId) where.companyId = companyId;

    const slots = await this.prisma.planningSlot.findMany({
      where,
      include: this.includes,
      orderBy: [{ date: 'asc' }, { userId: 'asc' }],
    });

    return slots.map(this.mapSlot);
  }

  async create(dto: CreatePlanningSlotDto, companyId: string) {
    // Upsert: if a slot already exists for this user+date, replace the job
    const slot = await this.prisma.planningSlot.upsert({
      where: { userId_date: { userId: dto.userId, date: new Date(dto.date) } },
      create: {
        userId: dto.userId,
        jobId: dto.jobId,
        date: new Date(dto.date),
        note: dto.note,
        companyId,
      },
      update: {
        jobId: dto.jobId,
        note: dto.note,
      },
      include: this.includes,
    });

    return this.mapSlot(slot);
  }

  async bulkCreate(dto: BulkCreatePlanningSlotDto, companyId: string) {
    const results = await Promise.all(
      dto.slots.map((item) =>
        this.prisma.planningSlot.upsert({
          where: { userId_date: { userId: item.userId, date: new Date(item.date) } },
          create: {
            userId: item.userId,
            jobId: item.jobId,
            date: new Date(item.date),
            note: item.note,
            companyId,
          },
          update: {
            jobId: item.jobId,
            note: item.note,
          },
          include: this.includes,
        }),
      ),
    );

    return results.map(this.mapSlot);
  }

  async delete(id: string, companyId: string | null) {
    const slot = await this.prisma.planningSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Planning slot not found');
    if (companyId && slot.companyId !== companyId) {
      throw new NotFoundException('Planning slot not found');
    }

    await this.prisma.planningSlot.delete({ where: { id } });
    return { deleted: true };
  }
}
