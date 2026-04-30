import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { CreateTeamSlotDto, WeekActionDto } from './dto/team-planning.dto';
import { getHolidayName } from '../lib/holidays';

@Injectable()
export class TeamPlanningService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private mail: MailService,
  ) {}

  // ─── Get week (upsert) ────────────────────────────────────────────────────

  async getWeek(companyId: string | null, weekStart: string) {
    const where: any = {};
    if (companyId) where.companyId = companyId;

    let week: any = null;
    if (companyId) {
      week = await this.prisma.teamPlanningWeek.upsert({
        where: { companyId_weekStart: { companyId, weekStart: new Date(weekStart) } },
        create: { companyId, weekStart: new Date(weekStart) },
        update: {},
        include: this.weekIncludes,
      });
    } else {
      const weeks = await this.prisma.teamPlanningWeek.findMany({
        where: { weekStart: new Date(weekStart) },
        include: this.weekIncludes,
      });
      return this.mapGroupWeeks(weeks, weekStart);
    }

    const teams = await this.prisma.team.findMany({
      where: { companyId, isActive: true },
      include: {
        members: {
          where: { activeTo: null },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { activeFrom: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return this.mapWeek(week, teams);
  }

  private weekIncludes = {
    slots: {
      include: {
        job: { select: { id: true, reference: true, title: true, address: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' as const }, { startHour: 'asc' as const }],
    },
    dispatchLogs: {
      orderBy: { sentAt: 'desc' as const },
      take: 1,
    },
    lockedByUser: { select: { name: true } },
  };

  private mapSlot(s: any) {
    return {
      id: s.id,
      teamId: s.teamId,
      date: s.date.toISOString().slice(0, 10),
      startHour: s.startHour,
      endHour: s.endHour,
      jobId: s.jobId,
      jobRef: s.job?.reference ?? '',
      jobTitle: s.job?.title ?? '',
      jobAddress: s.job?.address ?? '',
      notes: s.notes,
    };
  }

  private mapWeek(week: any, teams: any[]) {
    const lastLog = week.dispatchLogs?.[0];
    return {
      id: week.id,
      weekStart: week.weekStart.toISOString().slice(0, 10),
      status: week.status,
      version: week.version,
      lockedAt: week.lockedAt?.toISOString() ?? null,
      lockedByUser: week.lockedByUser?.name ?? null,
      lastDispatch: lastLog
        ? { sentAt: lastLog.sentAt.toISOString(), status: lastLog.status }
        : null,
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        members: t.members.map((m: any) => ({
          userId: m.userId,
          userName: m.user?.name ?? '',
          userEmail: m.user?.email ?? '',
          roleInTeam: m.roleInTeam,
        })),
      })),
      slots: (week.slots ?? []).map((s: any) => this.mapSlot(s)),
    };
  }

  private mapGroupWeeks(weeks: any[], weekStart: string) {
    const allSlots: any[] = [];
    let lastDispatch: any = null;

    for (const w of weeks) {
      for (const s of w.slots ?? []) {
        allSlots.push(this.mapSlot(s));
      }
      const lastLog = w.dispatchLogs?.[0];
      if (lastLog && (!lastDispatch || lastLog.sentAt > new Date(lastDispatch.sentAt))) {
        lastDispatch = { sentAt: lastLog.sentAt.toISOString(), status: lastLog.status };
      }
    }

    return {
      id: weeks[0]?.id ?? null,
      weekStart,
      status: weeks.length > 0 ? weeks[0].status : 'draft',
      version: weeks[0]?.version ?? 1,
      lockedAt: null,
      lockedByUser: null,
      lastDispatch,
      teams: [],
      slots: allSlots,
    };
  }

  // ─── Create slot ──────────────────────────────────────────────────────────

  async createSlot(dto: CreateTeamSlotDto, companyId: string, userId: string) {
    if (!companyId) throw new ForbiddenException('Cannot create under GROUP scope');
    if (dto.endHour <= dto.startHour) throw new BadRequestException('endHour must be greater than startHour');

    // Refuse public holidays — the frontend already hides the affordance, but
    // a direct API call must be blocked too. (B-NEW-3 from the night audit.)
    const holidayName = getHolidayName(dto.date);
    if (holidayName) {
      throw new BadRequestException(
        `Impossible de planifier sur un jour férié (${holidayName})`,
      );
    }

    const weekStartDate = this.getWeekStart(dto.date);

    const week = await this.prisma.teamPlanningWeek.upsert({
      where: { companyId_weekStart: { companyId, weekStart: weekStartDate } },
      create: { companyId, weekStart: weekStartDate },
      update: {},
    });

    if (week.status === 'locked') {
      throw new BadRequestException('Cannot modify a locked planning week');
    }

    // Check for overlapping slots on the same team+date
    const existing = await this.prisma.teamPlanningSlot.findMany({
      where: {
        teamId: dto.teamId,
        weekId: week.id,
        date: new Date(dto.date),
      },
    });

    const overlapping = existing.find(
      (s) => dto.startHour < s.endHour && dto.endHour > s.startHour,
    );
    if (overlapping) {
      throw new BadRequestException(
        `Créneau chevauche un créneau existant (${overlapping.startHour}h-${overlapping.endHour}h)`,
      );
    }

    let slot;
    try {
      slot = await this.prisma.teamPlanningSlot.create({
        data: {
          weekId: week.id,
          teamId: dto.teamId,
          date: new Date(dto.date),
          startHour: dto.startHour,
          endHour: dto.endHour,
          jobId: dto.jobId,
          notes: dto.notes,
        },
        include: {
          job: { select: { id: true, reference: true, title: true, address: true, requiredCertifications: true } },
        },
      });
    } catch (err) {
      // Map Prisma FK violations (P2003) to a clean 400 instead of leaking the
      // raw 'Foreign key constraint violated' stack to the toaster. The 3 FKs
      // on this table are weekId / teamId / jobId — a P2003 here almost
      // always means an unknown jobId or a team from another tenant.
      // (B-NEW-2 from the night audit.)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new BadRequestException('Chantier ou équipe inconnu(e)');
      }
      throw err;
    }

    // Check certification warnings
    const warnings: string[] = [];
    const required = (slot.job as any)?.requiredCertifications ?? [];
    if (required.length > 0) {
      const members = await this.prisma.teamMember.findMany({
        where: { teamId: dto.teamId, activeTo: null },
        select: { userId: true, user: { select: { name: true } } },
      });
      for (const member of members) {
        const docs = await this.prisma.hrDocument.findMany({
          where: {
            userId: member.userId,
            type: { in: required },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: { type: true },
        });
        const found = docs.map(d => d.type);
        const missing = required.filter((r: string) => !found.includes(r));
        if (missing.length > 0) {
          warnings.push(`${(member as any).user.name}: ${missing.join(', ')} manquant(s)`);
        }
      }
    }

    return { ...this.mapSlot(slot), warnings };
  }

  // ─── Delete slot ──────────────────────────────────────────────────────────

  async deleteSlot(id: string, companyId: string | null) {
    if (!companyId) throw new ForbiddenException('Cannot delete under GROUP scope');

    const slot = await this.prisma.teamPlanningSlot.findUnique({
      where: { id },
      include: { week: true },
    });
    if (!slot) throw new NotFoundException('Slot not found');

    if (slot.week.status === 'locked') {
      throw new BadRequestException('Cannot modify a locked planning week');
    }

    if (companyId && slot.week.companyId !== companyId) {
      throw new NotFoundException('Slot not found');
    }

    await this.prisma.teamPlanningSlot.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Lock week ────────────────────────────────────────────────────────────

  async lockWeek(companyId: string, weekStart: string, userId: string) {
    if (!companyId) throw new ForbiddenException('Cannot lock under GROUP scope');

    const week = await this.prisma.teamPlanningWeek.findUnique({
      where: { companyId_weekStart: { companyId, weekStart: new Date(weekStart) } },
    });
    if (!week) throw new NotFoundException('Planning week not found');
    if (week.status === 'locked') throw new BadRequestException('Week is already locked');

    const updated = await this.prisma.teamPlanningWeek.update({
      where: { id: week.id },
      data: {
        status: 'locked',
        lockedAt: new Date(),
        lockedByUserId: userId,
      },
    });

    this.audit.log({
      action: 'LOCK_PLANNING',
      entity: 'team_planning_week',
      entityId: week.id,
      after: { status: 'locked', weekStart, version: week.version },
      userId,
      companyId,
    });

    return { locked: true, version: updated.version };
  }

  // ─── Unlock week ──────────────────────────────────────────────────────────

  async unlockWeek(companyId: string, weekStart: string, userId: string) {
    if (!companyId) throw new ForbiddenException('Cannot unlock under GROUP scope');

    const week = await this.prisma.teamPlanningWeek.findUnique({
      where: { companyId_weekStart: { companyId, weekStart: new Date(weekStart) } },
    });
    if (!week) throw new NotFoundException('Planning week not found');
    if (week.status !== 'locked') throw new BadRequestException('Week is not locked');

    const updated = await this.prisma.teamPlanningWeek.update({
      where: { id: week.id },
      data: {
        status: 'draft',
        lockedAt: null,
        lockedByUserId: null,
        version: { increment: 1 },
      },
    });

    this.audit.log({
      action: 'UNLOCK_PLANNING',
      entity: 'team_planning_week',
      entityId: week.id,
      before: { status: 'locked', version: week.version },
      after: { status: 'draft', version: updated.version },
      userId,
      companyId,
    });

    return { unlocked: true, version: updated.version };
  }

  // ─── Send planning ────────────────────────────────────────────────────────

  async sendPlanning(companyId: string, weekStart: string, userId: string) {
    if (!companyId) throw new ForbiddenException('Cannot send under GROUP scope');

    const week = await this.prisma.teamPlanningWeek.findUnique({
      where: { companyId_weekStart: { companyId, weekStart: new Date(weekStart) } },
      include: {
        slots: {
          include: {
            job: { select: { reference: true, title: true, address: true } },
            team: {
              select: {
                name: true,
                members: {
                  where: { activeTo: null },
                  include: { user: { select: { name: true, email: true } } },
                },
              },
            },
          },
          orderBy: [{ date: 'asc' }, { startHour: 'asc' }],
        },
      },
    });

    if (!week) throw new NotFoundException('Planning week not found');

    const recipientMap = new Map<string, { name: string; email: string }>();
    for (const slot of week.slots) {
      for (const member of (slot.team as any).members ?? []) {
        const email = member.user?.email;
        if (email && email.includes('@')) {
          recipientMap.set(email, { name: member.user.name, email });
        }
      }
    }
    const recipients = Array.from(recipientMap.values());

    const html = this.buildPlanningHtml(week, weekStart);
    const subject = `Planning semaine du ${weekStart} — v${week.version}`;

    let status = 'success';
    const errors: string[] = [];

    if (!this.mail.isConfigured()) {
      console.log(`[Mail] SMTP not configured — simulating send to ${recipients.length} recipients`);
      status = 'simulated';
    } else {
      for (const r of recipients) {
        try {
          await this.mail.sendMail(r.email, subject, html);
        } catch (err: any) {
          errors.push(`${r.email}: ${err.message}`);
        }
      }
      if (errors.length > 0 && errors.length < recipients.length) {
        status = 'partial';
      } else if (errors.length === recipients.length && recipients.length > 0) {
        status = 'failed';
      }
    }

    await this.prisma.planningDispatchLog.create({
      data: {
        weekId: week.id,
        sentByUserId: userId,
        recipients: recipients.map((r) => r.email),
        status,
        error: errors.length > 0 ? errors.join('; ') : null,
        htmlContent: html,
      },
    });

    this.audit.log({
      action: 'SEND_PLANNING',
      entity: 'team_planning_week',
      entityId: week.id,
      after: { status, recipientCount: recipients.length, weekStart, version: week.version },
      userId,
      companyId,
    });

    return { sent: true, status, recipientCount: recipients.length, errors };
  }

  private buildPlanningHtml(week: any, weekStart: string): string {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
    const wsDate = new Date(weekStart);
    const dayDates = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(wsDate);
      d.setDate(wsDate.getDate() + i);
      return d.toISOString().slice(0, 10);
    });

    // Group slots by team
    const slotsByTeam = new Map<string, { teamName: string; slots: any[] }>();
    for (const slot of week.slots) {
      const teamName = (slot.team as any)?.name ?? 'Inconnu';
      if (!slotsByTeam.has(slot.teamId)) {
        slotsByTeam.set(slot.teamId, { teamName, slots: [] });
      }
      slotsByTeam.get(slot.teamId)!.slots.push(slot);
    }

    let rows = '';
    for (const [, team] of slotsByTeam) {
      rows += `<tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold;">${team.teamName}</td>`;
      for (const dateStr of dayDates) {
        const daySlots = team.slots
          .filter((s: any) => s.date.toISOString().slice(0, 10) === dateStr)
          .sort((a: any, b: any) => a.startHour - b.startHour);
        const cellContent = daySlots.map(
          (s: any) => `<div style="margin-bottom:2px;"><strong>${s.startHour}h-${s.endHour}h</strong>: ${s.job?.reference ?? ''}</div>`,
        ).join('');
        rows += `<td style="padding:6px;border:1px solid #ddd;font-size:12px;">${cellContent || '—'}</td>`;
      }
      rows += '</tr>';
    }

    return `
      <div style="font-family:Arial,sans-serif;max-width:800px;">
        <h2>Planning semaine du ${weekStart} (v${week.version})</h2>
        <table style="border-collapse:collapse;width:100%;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;border:1px solid #ddd;">Équipe</th>
              ${dayDates.map((d, i) => `<th style="padding:8px;border:1px solid #ddd;">${days[i]} ${d.slice(5)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  // ─── My planning (technicien) ─────────────────────────────────────────────

  async getMyPlanning(userId: string, weekStart: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId, activeTo: null },
      select: { teamId: true, team: { select: { name: true, companyId: true } } },
    });

    if (memberships.length === 0) {
      return { weekStart, slots: [] };
    }

    const teamIds = memberships.map((m) => m.teamId);
    const companyIds = [...new Set(memberships.map((m) => m.team.companyId))];

    const weeks = await this.prisma.teamPlanningWeek.findMany({
      where: {
        weekStart: new Date(weekStart),
        companyId: { in: companyIds },
      },
      select: { id: true },
    });

    if (weeks.length === 0) {
      return { weekStart, slots: [] };
    }

    const slots = await this.prisma.teamPlanningSlot.findMany({
      where: {
        weekId: { in: weeks.map((w) => w.id) },
        teamId: { in: teamIds },
      },
      include: {
        job: { select: { reference: true, title: true, address: true } },
        team: { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { startHour: 'asc' }],
    });

    return {
      weekStart,
      slots: slots.map((s) => ({
        id: s.id,
        date: s.date.toISOString().slice(0, 10),
        startHour: s.startHour,
        endHour: s.endHour,
        jobRef: s.job?.reference ?? '',
        jobTitle: s.job?.title ?? '',
        jobAddress: s.job?.address ?? '',
        teamName: s.team?.name ?? '',
      })),
    };
  }

  /**
   * Copy every slot of `sourceWeekStart` into `targetWeekStart`, preserving
   * teamId / jobId / startHour / endHour / day-of-week. Slots that would
   * overlap an existing target slot are silently skipped (we don't want a
   * single conflict to abort the whole copy). Returns counts so the UI can
   * report `X copied, Y skipped`.
   */
  async copyWeek(
    companyId: string | null,
    sourceWeekStart: string,
    targetWeekStart: string,
    userId: string,
  ) {
    if (!companyId) throw new ForbiddenException('Cannot copy under GROUP scope');

    const sourceMonday = this.getWeekStart(sourceWeekStart);
    const targetMonday = this.getWeekStart(targetWeekStart);
    if (sourceMonday.getTime() === targetMonday.getTime()) {
      throw new BadRequestException('Source and target weeks must differ');
    }

    const sourceWeek = await this.prisma.teamPlanningWeek.findUnique({
      where: { companyId_weekStart: { companyId, weekStart: sourceMonday } },
      include: { slots: true },
    });
    if (!sourceWeek || sourceWeek.slots.length === 0) {
      return { copied: 0, skipped: 0, message: 'Source week has no slot to copy' };
    }

    const targetWeek = await this.prisma.teamPlanningWeek.upsert({
      where: { companyId_weekStart: { companyId, weekStart: targetMonday } },
      create: { companyId, weekStart: targetMonday },
      update: {},
    });
    if (targetWeek.status === 'locked') {
      throw new BadRequestException('Target week is locked');
    }

    const existingTargetSlots = await this.prisma.teamPlanningSlot.findMany({
      where: { weekId: targetWeek.id },
    });

    let copied = 0, skipped = 0;
    const dayOffsetMs = targetMonday.getTime() - sourceMonday.getTime();
    for (const s of sourceWeek.slots) {
      const newDate = new Date(s.date.getTime() + dayOffsetMs);
      const overlap = existingTargetSlots.find(es =>
        es.teamId === s.teamId &&
        es.date.toISOString().slice(0, 10) === newDate.toISOString().slice(0, 10) &&
        s.startHour < es.endHour && s.endHour > es.startHour
      );
      if (overlap) { skipped++; continue; }

      const created = await this.prisma.teamPlanningSlot.create({
        data: {
          weekId: targetWeek.id,
          teamId: s.teamId,
          date: newDate,
          startHour: s.startHour,
          endHour: s.endHour,
          jobId: s.jobId,
          notes: s.notes,
        },
      });
      existingTargetSlots.push(created);
      copied++;
    }

    this.audit.log?.({
      action: 'PLANNING_WEEK_COPY',
      entity: 'team-planning-week',
      entityId: targetWeek.id,
      after: { sourceWeekStart, targetWeekStart, copied, skipped },
      companyId,
      userId,
    });

    return { copied, skipped };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getWeekStart(dateStr: string): Date {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
