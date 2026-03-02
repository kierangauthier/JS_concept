import { Injectable, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter | null = null;

  onModuleInit() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      console.log(`[Mail] SMTP configured: ${host}:${port}`);
    } else {
      console.log('[Mail] SMTP not configured — emails will be simulated');
    }
  }

  isConfigured(): boolean {
    return !!this.transporter;
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP not configured');
    }

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@concept-manager.fr',
      to,
      subject,
      html,
    });
  }
}
