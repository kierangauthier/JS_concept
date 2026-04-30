import { Controller, Get, Param, Req, Res, ForbiddenException, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';

/**
 * Admin-only "tenant data dump" used by the buyer-facing /admin/export-donnees
 * page. Each table is served as its own CSV download — the front-end queues
 * sequential anchor clicks so the user ends up with a small folder of
 * exports + a manifest. We deliberately do NOT bundle into a ZIP server-side
 * (would require a new dep + container rebuild) and do NOT include PDFs or
 * photos — those would multi-GB and require MinIO bulk fetch with signed
 * URLs. The page degrades honestly with a "sur demande, par e-mail" CTA for
 * those.
 *
 * Scope rules: tenant admins get only their company's rows. Group admins
 * (Acreed cross-tenant) get all rows. Each download is audit-logged.
 */
@Controller('api/admin/export/data')
@Roles('admin')
export class DataDumpController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private csvField(value: any): string {
    if (value === null || value === undefined) return '';
    const s = value instanceof Date ? value.toISOString() : String(value);
    if (/[",\n;\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  private buildCsv(headers: string[], rows: any[][]): string {
    const lines = [headers.join(';'), ...rows.map((r) => r.map((v) => this.csvField(v)).join(';'))];
    // BOM so Excel opens UTF-8 correctly.
    return '﻿' + lines.join('\n');
  }

  private companyFilter(req: any) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Authentification requise');
    if (user.isGroupAdmin) return {};
    if (!user.companyId) throw new ForbiddenException('Aucune entité associée');
    return { companyId: user.companyId };
  }

  @Get('manifest')
  async manifest(@Req() req: any) {
    const filter = this.companyFilter(req);
    const [clients, quotes, invoices, jobs, timeEntries] = await Promise.all([
      this.prisma.client.count({ where: { ...filter, deletedAt: null } }),
      this.prisma.quote.count({ where: { ...filter, deletedAt: null } }),
      this.prisma.invoice.count({ where: { ...filter, deletedAt: null } }),
      this.prisma.job.count({ where: { ...filter, deletedAt: null } }),
      this.prisma.timeEntry.count({ where: filter }),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.email ?? req.user.id,
      scope: req.user.isGroupAdmin ? 'GROUP' : (req.user.companyId ?? null),
      files: [
        { name: 'clients.csv', records: clients },
        { name: 'quotes.csv', records: quotes },
        { name: 'invoices.csv', records: invoices },
        { name: 'jobs.csv', records: jobs },
        { name: 'time-entries.csv', records: timeEntries },
      ],
      excluded: [
        { kind: 'invoice-pdfs', reason: 'Volumineux — export disponible sur demande au DPO.' },
        { kind: 'job-photos', reason: 'Volumineux + métadonnées EXIF — export disponible sur demande au DPO.' },
      ],
      legalBasis: 'RGPD article 20 (droit à la portabilité)',
    };
  }

  @Get(':type')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async dump(@Param('type') type: string, @Req() req: any, @Res() res: Response) {
    const filter = this.companyFilter(req);
    let csv: string;
    let filename: string;

    switch (type) {
      case 'clients': {
        const rows = await this.prisma.client.findMany({
          where: { ...filter, deletedAt: null },
          orderBy: { createdAt: 'asc' },
        });
        csv = this.buildCsv(
          ['id', 'name', 'email', 'phone', 'siret', 'address', 'companyId', 'createdAt'],
          rows.map((c: any) => [c.id, c.name, c.email, c.phone, c.siret, c.address, c.companyId, c.createdAt]),
        );
        filename = 'clients.csv';
        break;
      }
      case 'quotes': {
        const rows = await this.prisma.quote.findMany({
          where: { ...filter, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, reference: true, subject: true, clientId: true, amount: true, vatRate: true,
            status: true, validUntil: true, companyId: true, createdAt: true,
          },
        });
        csv = this.buildCsv(
          ['id', 'reference', 'subject', 'clientId', 'amount', 'vatRate', 'status', 'validUntil', 'companyId', 'createdAt'],
          rows.map((q: any) => [q.id, q.reference, q.subject, q.clientId, q.amount, q.vatRate, q.status, q.validUntil, q.companyId, q.createdAt]),
        );
        filename = 'quotes.csv';
        break;
      }
      case 'invoices': {
        const rows = await this.prisma.invoice.findMany({
          where: { ...filter, deletedAt: null },
          orderBy: { issuedAt: 'asc' },
          select: {
            id: true, reference: true, clientId: true, jobId: true, amount: true, vatRate: true,
            status: true, issuedAt: true, dueDate: true, paidAt: true, companyId: true, createdAt: true,
          },
        });
        csv = this.buildCsv(
          ['id', 'reference', 'clientId', 'jobId', 'amount', 'vatRate', 'status', 'issuedAt', 'dueDate', 'paidAt', 'companyId', 'createdAt'],
          rows.map((i: any) => [i.id, i.reference, i.clientId, i.jobId, i.amount, i.vatRate, i.status, i.issuedAt, i.dueDate, i.paidAt, i.companyId, i.createdAt]),
        );
        filename = 'invoices.csv';
        break;
      }
      case 'jobs': {
        const rows = await this.prisma.job.findMany({
          where: { ...filter, deletedAt: null },
          orderBy: { startDate: 'asc' },
          select: {
            id: true, reference: true, title: true, address: true, status: true, progress: true,
            startDate: true, endDate: true, clientId: true, quoteId: true, companyId: true, createdAt: true,
          },
        });
        csv = this.buildCsv(
          ['id', 'reference', 'title', 'address', 'status', 'progress', 'startDate', 'endDate', 'clientId', 'quoteId', 'companyId', 'createdAt'],
          rows.map((j: any) => [j.id, j.reference, j.title, j.address, j.status, j.progress, j.startDate, j.endDate, j.clientId, j.quoteId, j.companyId, j.createdAt]),
        );
        filename = 'jobs.csv';
        break;
      }
      case 'time-entries': {
        const rows = await this.prisma.timeEntry.findMany({
          where: filter,
          orderBy: { date: 'asc' },
        });
        csv = this.buildCsv(
          ['id', 'userId', 'jobId', 'date', 'hours', 'description', 'companyId', 'createdAt'],
          rows.map((t: any) => [t.id, t.userId, t.jobId, t.date, t.hours, t.description, t.companyId, t.createdAt]),
        );
        filename = 'time-entries.csv';
        break;
      }
      default:
        throw new BadRequestException(`Type d'export inconnu : ${type}`);
    }

    this.audit.log({
      action: 'DATA_DUMP',
      entity: type,
      entityId: req.user.companyId ?? 'GROUP',
      userId: req.user.id,
      companyId: req.user.companyId ?? null,
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(csv);
  }
}
