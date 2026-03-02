import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getHoursReport(
    companyId: string | null,
    weekOf: string,
    groupBy: 'user' | 'job',
  ) {
    const monday = this.getMonday(weekOf);
    const friday = new Date(monday.getTime() + 4 * 86400000);

    if (groupBy === 'user') {
      return this.getHoursByUser(companyId, monday, friday);
    }
    return this.getHoursByJob(companyId, monday, friday);
  }

  private async getHoursByUser(companyId: string | null, from: Date, to: Date) {
    const whereUser: any = { isActive: true, role: 'technicien' };
    if (companyId) whereUser.companyId = companyId;

    const users = await this.prisma.user.findMany({
      where: whereUser,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const rows = [];
    for (const user of users) {
      // Planned hours: sum of (endHour - startHour) from team planning slots
      const memberships = await this.prisma.teamMember.findMany({
        where: { userId: user.id, activeTo: null },
        select: { teamId: true },
      });
      const teamIds = memberships.map(m => m.teamId);

      let planned = 0;
      if (teamIds.length > 0) {
        const slots = await this.prisma.teamPlanningSlot.findMany({
          where: {
            teamId: { in: teamIds },
            date: { gte: from, lte: to },
          },
          select: { startHour: true, endHour: true },
        });
        planned = slots.reduce((s, sl) => s + (sl.endHour - sl.startHour), 0);
      }

      // Actual hours: sum of approved time entries
      const whereTime: any = {
        userId: user.id,
        date: { gte: from, lte: to },
        status: 'approved',
      };
      if (companyId) whereTime.companyId = companyId;

      const entries = await this.prisma.timeEntry.findMany({
        where: whereTime,
        select: { hours: true },
      });
      const actual = entries.reduce((s, e) => s + Number(e.hours), 0);

      rows.push({
        id: user.id,
        label: user.name,
        planned,
        actual,
        delta: actual - planned,
        ratio: planned > 0 ? Math.round((actual / planned) * 100) : 0,
      });
    }

    return {
      weekOf: from.toISOString().slice(0, 10),
      groupBy: 'user' as const,
      rows,
      totals: {
        planned: rows.reduce((s, r) => s + r.planned, 0),
        actual: rows.reduce((s, r) => s + r.actual, 0),
      },
    };
  }

  private async getHoursByJob(companyId: string | null, from: Date, to: Date) {
    const whereJob: any = { status: { in: ['planned', 'in_progress'] }, deletedAt: null };
    if (companyId) whereJob.companyId = companyId;

    const jobs = await this.prisma.job.findMany({
      where: whereJob,
      select: { id: true, reference: true, title: true, estimatedHours: true },
      orderBy: { reference: 'asc' },
    });

    const rows = [];
    for (const job of jobs) {
      // Planned: slots for this job in the week
      const slots = await this.prisma.teamPlanningSlot.findMany({
        where: {
          jobId: job.id,
          date: { gte: from, lte: to },
        },
        select: { startHour: true, endHour: true },
      });
      const planned = slots.reduce((s, sl) => s + (sl.endHour - sl.startHour), 0);

      // Actual: approved time entries for this job in the week
      const whereTime: any = {
        jobId: job.id,
        date: { gte: from, lte: to },
        status: 'approved',
      };
      if (companyId) whereTime.companyId = companyId;

      const entries = await this.prisma.timeEntry.findMany({
        where: whereTime,
        select: { hours: true },
      });
      const actual = entries.reduce((s, e) => s + Number(e.hours), 0);

      if (planned > 0 || actual > 0) {
        rows.push({
          id: job.id,
          label: `${job.reference} — ${job.title}`,
          planned,
          actual,
          delta: actual - planned,
          ratio: planned > 0 ? Math.round((actual / planned) * 100) : 0,
          estimated: job.estimatedHours ? Number(job.estimatedHours) : null,
        });
      }
    }

    return {
      weekOf: from.toISOString().slice(0, 10),
      groupBy: 'job' as const,
      rows,
      totals: {
        planned: rows.reduce((s, r) => s + r.planned, 0),
        actual: rows.reduce((s, r) => s + r.actual, 0),
      },
    };
  }

  async exportHoursCsv(companyId: string | null, weekOf: string, groupBy: 'user' | 'job') {
    const report = await this.getHoursReport(companyId, weekOf, groupBy);
    const header = groupBy === 'user'
      ? 'Collaborateur;Planifié (h);Réalisé (h);Écart;Ratio %'
      : 'Chantier;Planifié (h);Réalisé (h);Écart;Ratio %;Estimé (h)';

    const lines = report.rows.map(r => {
      const base = `${r.label};${r.planned};${r.actual};${r.delta};${r.ratio}`;
      return groupBy === 'job' ? `${base};${(r as any).estimated ?? ''}` : base;
    });

    return `${header}\n${lines.join('\n')}`;
  }

  private getMonday(dateStr: string): Date {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
