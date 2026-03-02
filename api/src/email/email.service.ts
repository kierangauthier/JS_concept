import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { QuotesService } from '../quotes/quotes.service';
import { InvoicesService } from '../invoices/invoices.service';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private quotesService: QuotesService,
    private invoicesService: InvoicesService,
  ) {}

  async sendEntityEmail(
    dto: SendEmailDto,
    companyId: string,
    userId: string,
  ) {
    let pdfBuffer: Buffer;
    let reference: string;
    let defaultSubject: string;
    let defaultMessage: string;

    if (dto.entityType === 'quote') {
      const result = await this.quotesService.generatePdf(dto.entityId, companyId);
      pdfBuffer = result.buffer;
      reference = result.reference;
      defaultSubject = `Devis ${reference}`;
      defaultMessage = `Veuillez trouver ci-joint le devis ${reference}.\n\nCordialement,`;
    } else {
      const result = await this.invoicesService.generatePdf(dto.entityId, companyId);
      pdfBuffer = result.buffer;
      reference = result.reference;
      defaultSubject = `Facture ${reference}`;
      defaultMessage = `Veuillez trouver ci-joint la facture ${reference}.\n\nCordialement,`;
    }

    const subject = dto.subject || defaultSubject;
    const message = dto.message || defaultMessage;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;">
        <p>${message.replace(/\n/g, '<br/>')}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
        <p style="color:#999;font-size:12px;">Ce message a été envoyé via ConceptManager.</p>
      </div>
    `;

    let status = 'sent';
    let error: string | null = null;

    if (this.mail.isConfigured()) {
      try {
        // For sending with attachment we need to use nodemailer directly
        // The MailService.sendMail doesn't support attachments, so we extend
        await this.sendMailWithAttachment(dto.to, subject, html, {
          filename: `${reference}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
      } catch (err: any) {
        status = 'failed';
        error = err.message;
      }
    } else {
      status = 'simulated';
    }

    // Log the email
    await this.prisma.emailLog.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        recipientEmail: dto.to,
        subject,
        status,
        error,
        sentByUserId: userId,
        companyId,
      },
    });

    // Also log as activity
    await this.prisma.activityLog.create({
      data: {
        entityId: dto.entityId,
        entityType: dto.entityType,
        action: 'EMAIL_SENT',
        detail: `Email envoyé à ${dto.to} (${status})`,
        companyId,
        userId,
      },
    });

    return { sent: status !== 'failed', status, reference };
  }

  async getEmailLogs(entityType: string, entityId: string) {
    return this.prisma.emailLog.findMany({
      where: { entityType, entityId },
      orderBy: { sentAt: 'desc' },
    });
  }

  private async sendMailWithAttachment(
    to: string,
    subject: string,
    html: string,
    attachment: { filename: string; content: Buffer; contentType: string },
  ) {
    // Access transporter via reflection since MailService doesn't expose it
    // Better approach: we use nodemailer directly here
    const nodemailer = require('nodemailer');
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error('SMTP not configured');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@concept-manager.fr',
      to,
      subject,
      html,
      attachments: [attachment],
    });
  }
}
