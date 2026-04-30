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

  // ─── Dashboard rapports (PR #39) ───────────────────────────────────────

  /**
   * 1. CA + marge mensuels (12 derniers mois). Une ligne par mois avec total
   * facturé HT (sent / overdue / paid agrégés) et marge nette. La marge n'est
   * pas stockée par mois en DB ; on l'approche en projetant la marge globale
   * de la company (jobs in_progress + planned + completed) sur le poids du
   * mois — suffisant pour visualiser une tendance, le drill-down est ailleurs.
   */
  async getMonthlyRevenue(companyId: string | null) {
    const where = companyId ? `WHERE i."companyId" = '${companyId}' AND i."deletedAt" IS NULL` : 'WHERE i."deletedAt" IS NULL';
    const rows = await this.prisma.$queryRawUnsafe<Array<{ month: string; revenue: string; n: bigint }>>(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', i."issuedAt"), 'YYYY-MM') AS month,
        COALESCE(SUM(i.amount), 0)::text AS revenue,
        COUNT(*)::bigint AS n
      FROM invoices i
      ${where}
        AND i.status IN ('sent', 'overdue', 'paid')
        AND i."issuedAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', i."issuedAt")
      ORDER BY 1 ASC
    `);

    return {
      months: rows.map(r => ({
        month: r.month,
        revenue: Number(r.revenue),
        invoiceCount: Number(r.n),
      })),
    };
  }

  /** 2. Top 10 clients par CA sur 12 mois. */
  async getTopClients(companyId: string | null) {
    const where = companyId ? `WHERE i."companyId" = '${companyId}' AND i."deletedAt" IS NULL` : 'WHERE i."deletedAt" IS NULL';
    const rows = await this.prisma.$queryRawUnsafe<Array<{
      clientId: string; clientName: string; revenue: string; jobCount: bigint;
    }>>(`
      SELECT
        c.id AS "clientId",
        c.name AS "clientName",
        COALESCE(SUM(i.amount), 0)::text AS revenue,
        COUNT(DISTINCT i."jobId")::bigint AS "jobCount"
      FROM invoices i
      JOIN clients c ON c.id = i."clientId"
      ${where}
        AND i.status IN ('sent', 'overdue', 'paid')
        AND i."issuedAt" >= NOW() - INTERVAL '12 months'
      GROUP BY c.id, c.name
      ORDER BY SUM(i.amount) DESC
      LIMIT 10
    `);

    return {
      clients: rows.map((r, i) => ({
        rank: i + 1,
        clientId: r.clientId,
        clientName: r.clientName,
        revenue: Number(r.revenue),
        jobCount: Number(r.jobCount),
      })),
    };
  }

  /**
   * 3. Pipeline commercial — total HT par status de devis. La vue 'expected'
   * standard regroupe draft/sent/accepted/refused/expired sur les 6 derniers
   * mois (le pipeline >6 mois est rarement actionnable).
   */
  async getPipeline(companyId: string | null) {
    const where = companyId ? `WHERE q."companyId" = '${companyId}' AND q."deletedAt" IS NULL` : 'WHERE q."deletedAt" IS NULL';
    const rows = await this.prisma.$queryRawUnsafe<Array<{ status: string; total: string; n: bigint }>>(`
      SELECT
        q.status::text AS status,
        COALESCE(SUM(q.amount), 0)::text AS total,
        COUNT(*)::bigint AS n
      FROM quotes q
      ${where}
        AND q."createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY q.status
      ORDER BY q.status
    `);

    const labels: Record<string, string> = {
      draft: 'Brouillon',
      sent: 'Envoyé',
      accepted: 'Accepté',
      refused: 'Refusé',
      expired: 'Expiré',
    };
    return {
      stages: rows.map(r => ({
        status: r.status,
        label: labels[r.status] ?? r.status,
        total: Number(r.total),
        count: Number(r.n),
      })),
    };
  }

  /** 5. Factures en retard (status=overdue), triées par retard décroissant. */
  async getOverdueInvoices(companyId: string | null) {
    const whereCompany = companyId ? `AND i."companyId" = '${companyId}'` : '';
    const rows = await this.prisma.$queryRawUnsafe<Array<{
      id: string; reference: string; clientName: string;
      amount: string; dueDate: Date; daysOverdue: bigint;
    }>>(`
      SELECT
        i.id, i.reference,
        c.name AS "clientName",
        i.amount::text AS amount,
        i."dueDate",
        EXTRACT(DAY FROM NOW() - i."dueDate")::bigint AS "daysOverdue"
      FROM invoices i
      LEFT JOIN clients c ON c.id = i."clientId"
      WHERE i.status = 'overdue' AND i."deletedAt" IS NULL
        ${whereCompany}
      ORDER BY i."dueDate" ASC
      LIMIT 50
    `);

    return {
      invoices: rows.map(r => ({
        id: r.id,
        reference: r.reference,
        clientName: r.clientName ?? '—',
        amount: Number(r.amount),
        dueDate: r.dueDate.toISOString().slice(0, 10),
        daysOverdue: Number(r.daysOverdue),
      })),
    };
  }

  /**
   * 4. Charge équipes — heatmap planning_slots par semaine × équipe sur 12
   * dernières semaines. Une cellule = somme des heures (8h par slot par
   * convention legacy, le model n'a pas de durée explicite).
   */
  async getTeamWorkload(companyId: string | null) {
    const whereWeek = companyId ? `AND tpw."companyId" = '${companyId}'` : '';
    const whereTeam = companyId ? `WHERE t."companyId" = '${companyId}'` : '';

    // Slots aggregated by team × ISO week (Monday-based) for the last 12 weeks.
    // companyId is on the week, not the slot — join via weekId.
    const cells = await this.prisma.$queryRawUnsafe<Array<{
      teamId: string; teamName: string; weekStart: Date; hours: string;
    }>>(`
      SELECT
        t.id AS "teamId",
        t.name AS "teamName",
        DATE_TRUNC('week', tps.date)::date AS "weekStart",
        COALESCE(SUM(tps."endHour" - tps."startHour"), 0)::text AS hours
      FROM team_planning_slots tps
      JOIN team_planning_weeks tpw ON tpw.id = tps."weekId"
      JOIN teams t ON t.id = tps."teamId"
      WHERE tps.date >= NOW() - INTERVAL '12 weeks'
        ${whereWeek}
      GROUP BY t.id, t.name, DATE_TRUNC('week', tps.date)
      ORDER BY t.name ASC, "weekStart" ASC
    `);

    const teams = await this.prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(`
      SELECT id, name FROM teams t ${whereTeam} ORDER BY name ASC
    `);

    return {
      teams: teams.map(t => ({ id: t.id, name: t.name })),
      cells: cells.map(c => ({
        teamId: c.teamId,
        weekStart: c.weekStart.toISOString().slice(0, 10),
        hours: Number(c.hours),
      })),
    };
  }
}
