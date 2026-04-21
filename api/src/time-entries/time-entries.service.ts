import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { TimeEntryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto, UpdateTimeEntryDto } from './dto/create-time-entry.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TimeEntriesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private mapEntry(t: any) {
    return {
      id: t.id,
      userId: t.userId,
      userName: t.user?.name ?? '',
      jobId: t.jobId,
      jobRef: t.job?.reference ?? '',
      date: t.date.toISOString(),
      hours: Number(t.hours),
      description: t.description,
      status: t.status,
      rejectionReason: t.rejectionReason ?? null,
      company: t.company?.code ?? '',
    };
  }

  private includes = {
    user: { select: { name: true } },
    job: { select: { reference: true } },
    company: { select: { code: true } },
  };

  async findAll(companyId: string | null, pagination: PaginationDto, userId?: string, role?: string) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    // Technicien: own entries only
    if (role === 'technicien' && userId) where.userId = userId;

    const [data, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where, skip: pagination.skip, take: pagination.limit,
        orderBy: { date: 'desc' }, include: this.includes,
      }),
      this.prisma.timeEntry.count({ where }),
    ]);
    return { data: data.map(this.mapEntry), total, page: pagination.page, limit: pagination.limit };
  }

  async create(dto: CreateTimeEntryDto, userId: string, companyId: string) {
    const entry = await this.prisma.timeEntry.create({
      data: {
        id: createId(),
        date: new Date(dto.date),
        hours: dto.hours,
        description: dto.description,
        status: 'draft',
        userId,
        jobId: dto.jobId,
        companyId,
      },
      include: this.includes,
    });
    return this.mapEntry(entry);
  }

  async update(id: string, dto: UpdateTimeEntryDto, userId: string, role: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Time entry not found');
    if (role === 'technicien' && entry.userId !== userId) {
      throw new ForbiddenException('Cannot edit another user\'s time entry');
    }
    if (entry.status !== 'draft') {
      throw new BadRequestException('Can only edit draft entries');
    }

    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        hours: dto.hours,
        description: dto.description,
      },
      include: this.includes,
    });
    return this.mapEntry(updated);
  }

  async submit(ids: string[], userId: string) {
    const entries = await this.prisma.timeEntry.findMany({
      where: { id: { in: ids }, userId, status: 'draft' },
    });
    if (entries.length === 0) throw new BadRequestException('No draft entries found for this user');

    await this.prisma.timeEntry.updateMany({
      where: { id: { in: entries.map(e => e.id) } },
      data: { status: 'submitted' },
    });

    return { submitted: entries.length };
  }

  async approve(id: string, userId: string) {
    return this.transition(id, 'submitted', 'approved', userId, 'APPROVE_TIME_ENTRY');
  }

  async approveBatch(ids: string[], userId: string) {
    const entries = await this.prisma.timeEntry.findMany({
      where: { id: { in: ids }, status: 'submitted' },
    });
    if (entries.length === 0) throw new BadRequestException('No submitted entries found');

    await this.prisma.timeEntry.updateMany({
      where: { id: { in: entries.map(e => e.id) } },
      data: { status: 'approved' },
    });

    for (const entry of entries) {
      this.audit.log({
        action: 'APPROVE_TIME_ENTRY', entity: 'time_entry', entityId: entry.id,
        before: { status: 'submitted' }, after: { status: 'approved' },
        userId, companyId: entry.companyId,
      });
    }

    return { approved: entries.length };
  }

  async reject(id: string, userId: string, rejectionReason?: string) {
    const reason = (rejectionReason ?? '').trim();
    if (reason.length < 3) {
      throw new BadRequestException('Un motif de refus est requis (3 caractères minimum)');
    }

    const entry = await this.prisma.timeEntry.findUnique({ where: { id }, include: this.includes });
    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.status !== 'submitted') {
      throw new BadRequestException(`Cannot transition from ${entry.status} to rejected`);
    }

    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        rejectedByUserId: userId,
      },
      include: this.includes,
    });

    this.audit.log({
      action: 'REJECT_TIME_ENTRY', entity: 'time_entry', entityId: id,
      before: { status: 'submitted' },
      after: { status: 'rejected', rejectionReason: reason, rejectedByUserId: userId },
      userId, companyId: entry.companyId,
    });

    return this.mapEntry(updated);
  }

  private async transition(id: string, from: TimeEntryStatus, to: TimeEntryStatus, userId: string, action: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id }, include: this.includes });
    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.status !== from) {
      throw new BadRequestException(`Cannot transition from ${entry.status} to ${to}`);
    }

    // Reset the rejection trail when moving back to a non-rejected state (e.g. re-approval after correction).
    const extraData: any = {};
    if (from === 'rejected' && to !== 'rejected') {
      extraData.rejectionReason = null;
      extraData.rejectedByUserId = null;
    }

    const updated = await this.prisma.timeEntry.update({
      where: { id }, data: { status: to, ...extraData }, include: this.includes,
    });

    this.audit.log({
      action, entity: 'time_entry', entityId: id,
      before: { status: from }, after: { status: to },
      userId, companyId: entry.companyId,
    });

    return this.mapEntry(updated);
  }
}
