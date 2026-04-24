import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto, UpdateJobDto } from './dto/create-job.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';

const JOB_TRANSITIONS: Record<string, string[]> = {
  planned: ['in_progress'],
  in_progress: ['paused', 'completed'],
  paused: ['in_progress'],
  completed: ['invoiced'],
  invoiced: [],
};

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private mapJob(j: any) {
    return {
      id: j.id,
      reference: j.reference,
      quoteId: j.quoteId,
      clientName: j.quote?.client?.name ?? j.client?.name ?? '',
      title: j.title,
      address: j.address,
      status: j.status,
      company: j.company?.code ?? '',
      startDate: j.startDate.toISOString(),
      endDate: j.endDate?.toISOString() ?? null,
      progress: j.progress,
      assignedTo: (j.assignments ?? []).map((a: any) => a.user?.name ?? ''),
    };
  }

  private jobIncludes = {
    company: { select: { code: true } },
    quote: { select: { client: { select: { name: true } } } },
    assignments: { include: { user: { select: { name: true, id: true } } } },
  };

  async findAll(
    companyId: string | null,
    pagination: PaginationDto,
    userId?: string,
    role?: string,
  ) {
    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;

    // Technicien: only their assigned jobs
    if (role === 'technicien' && userId) {
      where.assignments = { some: { userId } };
    }

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: this.jobIncludes,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data: data.map(this.mapJob),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async findOne(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;

    const job = await this.prisma.job.findFirst({
      where,
      include: {
        ...this.jobIncludes,
        timeEntries: {
          include: { user: { select: { name: true } } },
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });
    if (!job) throw new NotFoundException('Job not found');

    return {
      ...this.mapJob(job),
      timeEntries: job.timeEntries.map((t) => ({
        id: t.id,
        userId: t.userId,
        userName: t.user.name,
        date: t.date.toISOString(),
        hours: Number(t.hours),
        description: t.description,
        status: t.status,
      })),
    };
  }

  async create(dto: CreateJobDto, companyId: string, userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    const year = new Date().getFullYear();

    const job = await this.prisma.$transaction(async (tx) => {
      // Advisory lock per company — Postgres disallows FOR UPDATE on aggregates.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('job-seq:' || ${companyId}))`;

      const result = await tx.$queryRaw<[{ next_val: bigint }]>`
        SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_val
        FROM "jobs"
        WHERE "companyId" = ${companyId}
      `;
      const nextVal = Number(result[0].next_val);
      const ref = `CHT-${company!.code}-${year}-${String(nextVal).padStart(3, '0')}`;

      return tx.job.create({
        data: {
          id: createId(),
          reference: ref,
          title: dto.title,
          address: dto.address,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          quoteId: dto.quoteId,
          clientId: dto.clientId,
          companyId,
          assignments: dto.assignedUserIds
            ? { create: dto.assignedUserIds.map((uid) => ({ userId: uid })) }
            : undefined,
        },
        include: this.jobIncludes,
      });
    });

    const ref = job.reference;
    await this.prisma.activityLog.create({
      data: {
        entityId: job.id,
        entityType: 'job',
        action: 'CREATED',
        detail: `Chantier ${ref} créé`,
        companyId,
        userId,
      },
    });
    this.audit.log({
      action: 'CREATE',
      entity: 'job',
      entityId: job.id,
      after: { reference: ref },
      companyId,
      userId,
    });

    return this.mapJob(job);
  }

  async update(id: string, dto: UpdateJobDto, companyId: string | null, userId: string) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;

    const existing = await this.prisma.job.findFirst({ where });
    if (!existing) throw new NotFoundException('Job not found');

    // Enforce valid status transitions
    if (dto.status && dto.status !== existing.status) {
      const allowed = JOB_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Transition ${existing.status}→${dto.status} non autorisée`,
        );
      }
    }

    // Handle assignment updates
    if (dto.assignedUserIds) {
      await this.prisma.jobAssignment.deleteMany({ where: { jobId: id } });
      await this.prisma.jobAssignment.createMany({
        data: dto.assignedUserIds.map((uid) => ({ jobId: id, userId: uid })),
      });
    }

    const { assignedUserIds, ...updateData } = dto;
    const job = await this.prisma.job.update({
      where: { id },
      data: {
        ...updateData,
        status: updateData.status as any,
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
      },
      include: this.jobIncludes,
    });

    const statusChanged = dto.status && dto.status !== existing.status;
    const action = statusChanged ? `STATUS_${dto.status!.toUpperCase()}` : 'UPDATED';

    await this.prisma.activityLog.create({
      data: {
        entityId: id,
        entityType: 'job',
        action,
        detail: statusChanged ? `Statut → ${dto.status}` : 'Chantier mis à jour',
        companyId: existing.companyId,
        userId,
      },
    });
    this.audit.log({
      action,
      entity: 'job',
      entityId: id,
      before: { status: existing.status },
      after: { status: job.status },
      companyId,
      userId,
    });

    return this.mapJob(job);
  }

  async getTimeline(id: string, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;

    const job = await this.prisma.job.findFirst({ where });
    if (!job) throw new NotFoundException('Job not found');

    const activities = await this.prisma.activityLog.findMany({
      where: { entityId: id, entityType: 'job' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { name: true } } },
    });

    return activities.map((a) => ({
      id: a.id,
      action: a.action,
      detail: a.detail,
      userName: a.user?.name ?? 'System',
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async softDelete(id: string, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const job = await this.prisma.job.findFirst({ where });
    if (!job) throw new NotFoundException('Job not found');

    await this.prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async getMargin(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;
    const job = await this.prisma.job.findFirst({
      where,
      select: {
        id: true,
        reference: true,
        title: true,
        hourlyRate: true,
        estimatedHours: true,
        quoteId: true,
        quote: { select: { amount: true } },
        timeEntries: { where: { status: 'approved' }, select: { hours: true } },
        purchases: { where: { deletedAt: null }, select: { amount: true, status: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');

    const hourlyRate = Number(job.hourlyRate ?? 45);
    const quoteAmount = Number(job.quote?.amount ?? 0);

    // Sum accepted amendment amounts
    const amendmentResult = await this.prisma.quoteAmendment.aggregate({
      where: { quoteId: job.quoteId ?? '__none__', status: 'accepted', deletedAt: null },
      _sum: { amount: true },
    });
    const amendmentTotal = Number(amendmentResult._sum.amount ?? 0);

    const revenueHT = quoteAmount + amendmentTotal;
    const totalHours = job.timeEntries.reduce((s, t) => s + Number(t.hours), 0);
    const costHours = totalHours * hourlyRate;
    const costPurchases = job.purchases
      .filter(p => ['received', 'partial'].includes(p.status))
      .reduce((s, p) => s + Number(p.amount), 0);

    const totalCost = costHours + costPurchases;
    const margin = revenueHT - totalCost;
    const marginPercent = revenueHT > 0 ? (margin / revenueHT) * 100 : 0;

    return {
      revenueHT,
      costHours,
      costPurchases,
      totalCost,
      margin,
      marginPercent: Math.round(marginPercent * 10) / 10,
      totalHours,
      hourlyRate,
      estimatedHours: job.estimatedHours ? Number(job.estimatedHours) : null,
    };
  }

  async getDashboardMargins(companyId: string | null) {
    const where: any = {
      deletedAt: null,
      status: { in: ['in_progress', 'planned'] },
    };
    if (companyId) where.companyId = companyId;

    const jobs = await this.prisma.job.findMany({
      where,
      select: {
        id: true,
        reference: true,
        title: true,
        hourlyRate: true,
        estimatedHours: true,
        quoteId: true,
        quote: { select: { amount: true } },
        timeEntries: { where: { status: 'approved' }, select: { hours: true } },
        purchases: { where: { deletedAt: null }, select: { amount: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const margins = await Promise.all(
      jobs.map(async (job) => {
        const hourlyRate = Number(job.hourlyRate ?? 45);
        const quoteAmount = Number(job.quote?.amount ?? 0);

        const amendmentResult = await this.prisma.quoteAmendment.aggregate({
          where: { quoteId: job.quoteId ?? '__none__', status: 'accepted', deletedAt: null },
          _sum: { amount: true },
        });
        const amendmentTotal = Number(amendmentResult._sum.amount ?? 0);

        const revenueHT = quoteAmount + amendmentTotal;
        const totalHours = job.timeEntries.reduce((s, t) => s + Number(t.hours), 0);
        const costHours = totalHours * hourlyRate;
        const costPurchases = job.purchases
          .filter(p => ['received', 'partial'].includes(p.status))
          .reduce((s, p) => s + Number(p.amount), 0);

        const totalCost = costHours + costPurchases;
        const margin = revenueHT - totalCost;
        const marginPercent = revenueHT > 0 ? Math.round((margin / revenueHT) * 100 * 10) / 10 : 0;

        return {
          id: job.id,
          reference: job.reference,
          title: job.title,
          revenueHT,
          totalCost,
          margin,
          marginPercent,
        };
      }),
    );

    // Only include jobs with revenue (linked to a quote)
    const withRevenue = margins.filter(m => m.revenueHT > 0);
    const sorted = [...withRevenue].sort((a, b) => a.marginPercent - b.marginPercent);

    const avgMargin = withRevenue.length > 0
      ? Math.round(withRevenue.reduce((s, m) => s + m.marginPercent, 0) / withRevenue.length * 10) / 10
      : 0;

    return {
      avgMargin,
      worst: sorted.slice(0, 5),
      best: sorted.slice(-5).reverse(),
      lowMarginCount: withRevenue.filter(m => m.marginPercent < 15).length,
      lowMarginJobs: withRevenue.filter(m => m.marginPercent < 15).map(m => ({
        id: m.id,
        reference: m.reference,
        title: m.title,
        marginPercent: m.marginPercent,
      })),
    };
  }
}
