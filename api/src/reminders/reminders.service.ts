import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { CreateReminderRuleDto, UpdateReminderRuleDto } from './dto/create-reminder-rule.dto';

@Injectable()
export class RemindersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private mail: MailService,
  ) {}

  // ─── Rules CRUD ──────────────────────────────────────────────────────────

  async getRules(companyId: string) {
    return this.prisma.reminderRule.findMany({
      where: { companyId },
      orderBy: { level: 'asc' },
    });
  }

  async createRule(dto: CreateReminderRuleDto, companyId: string) {
    if (!companyId) throw new BadRequestException('Company required');
    return this.prisma.reminderRule.create({
      data: { ...dto, companyId },
    });
  }

  async updateRule(id: string, dto: UpdateReminderRuleDto, companyId: string) {
    const rule = await this.prisma.reminderRule.findFirst({
      where: { id, companyId },
    });
    if (!rule) throw new NotFoundException('Rule not found');
    return this.prisma.reminderRule.update({
      where: { id },
      data: dto,
    });
  }

  async deleteRule(id: string, companyId: string) {
    const rule = await this.prisma.reminderRule.findFirst({
      where: { id, companyId },
    });
    if (!rule) throw new NotFoundException('Rule not found');
    await this.prisma.reminderRule.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Reminder Logs ───────────────────────────────────────────────────────

  async getLogsByInvoice(invoiceId: string) {
    return this.prisma.reminderLog.findMany({
      where: { invoiceId },
      include: { rule: { select: { level: true, delayDays: true } } },
      orderBy: { sentAt: 'desc' },
    });
  }

  // ─── Process overdue invoices ─────────────────────────────────────────────

  async processOverdue(companyId: string | null, userId: string) {
    // Get all companies to process (or just one)
    const companies = companyId
      ? [{ id: companyId }]
      : await this.prisma.company.findMany({ select: { id: true } });

    const results: Array<{ companyId: string; sent: number; errors: string[] }> = [];

    for (const company of companies) {
      const result = await this.processCompanyOverdue(company.id, userId);
      results.push({ companyId: company.id, ...result });
    }

    return { processed: true, results };
  }

  private async processCompanyOverdue(companyId: string, userId: string) {
    // Get active rules for this company
    const rules = await this.prisma.reminderRule.findMany({
      where: { companyId, isActive: true },
      orderBy: { level: 'asc' },
    });

    if (rules.length === 0) return { sent: 0, errors: [] as string[] };

    // Get overdue invoices (sent or overdue status, past dueDate, not deleted)
    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['sent', 'overdue'] },
        dueDate: { lt: now },
        deletedAt: null,
      },
      include: {
        client: { select: { name: true, email: true } },
        reminderLogs: { select: { ruleId: true, sentAt: true } },
      },
    });

    let sent = 0;
    const errors: string[] = [];

    for (const invoice of invoices) {
      const clientEmail = invoice.client?.email;
      if (!clientEmail) continue;

      // Calculate days overdue
      const daysOverdue = Math.floor(
        (now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Find the highest applicable rule not yet sent
      for (const rule of rules) {
        if (daysOverdue < rule.delayDays) continue;

        // Check if this rule has already been sent for this invoice
        const alreadySent = invoice.reminderLogs.some(
          (log) => log.ruleId === rule.id,
        );
        if (alreadySent) continue;

        // Send reminder
        try {
          const html = this.buildReminderHtml(rule, invoice);
          const subject = this.interpolate(rule.subject, invoice);

          if (this.mail.isConfigured()) {
            await this.mail.sendMail(clientEmail, subject, html);
          }

          await this.prisma.reminderLog.create({
            data: {
              invoiceId: invoice.id,
              ruleId: rule.id,
              recipientEmail: clientEmail,
              status: this.mail.isConfigured() ? 'sent' : 'simulated',
              companyId,
            },
          });

          // Update invoice status to overdue if still 'sent'
          if (invoice.status === 'sent') {
            await this.prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: 'overdue' },
            });
          }

          this.audit.log({
            action: 'SEND_REMINDER',
            entity: 'invoice',
            entityId: invoice.id,
            after: { level: rule.level, recipientEmail: clientEmail, daysOverdue },
            userId,
            companyId,
          });

          sent++;
        } catch (err: any) {
          errors.push(`${invoice.reference}: ${err.message}`);

          await this.prisma.reminderLog.create({
            data: {
              invoiceId: invoice.id,
              ruleId: rule.id,
              recipientEmail: clientEmail,
              status: 'failed',
              error: err.message,
              companyId,
            },
          });
        }

        // Only send the first applicable unsent rule per invoice per run
        break;
      }
    }

    return { sent, errors };
  }

  private interpolate(template: string, invoice: any): string {
    return template
      .replace(/\{\{reference\}\}/g, invoice.reference)
      .replace(/\{\{amount\}\}/g, Number(invoice.amount).toFixed(2))
      .replace(/\{\{dueDate\}\}/g, invoice.dueDate.toISOString().slice(0, 10))
      .replace(/\{\{clientName\}\}/g, invoice.client?.name ?? '');
  }

  private buildReminderHtml(rule: any, invoice: any): string {
    const body = this.interpolate(rule.bodyTemplate, invoice);
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        ${body}
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee;" />
        <p style="font-size:12px;color:#888;">
          Facture ${invoice.reference} — Montant : ${Number(invoice.amount).toFixed(2)} € TTC<br/>
          Date d'échéance : ${invoice.dueDate.toLocaleDateString('fr-FR')}
        </p>
      </div>
    `;
  }
}
