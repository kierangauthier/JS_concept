import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { GdprService } from './gdpr.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * I3 / I4 — RGPD endpoints.
 *
 * Access rules:
 *  - GET  /api/users/:id/gdpr-export  →  the user themselves OR an admin
 *  - DELETE /api/users/:id/gdpr-erase →  admin only (destructive action)
 *
 * Both operations are audit-logged with PII masked (I2).
 */
@Controller('api/users')
export class GdprController {
  constructor(
    private gdpr: GdprService,
    private audit: AuditService,
    private prisma: PrismaService,
  ) {}

  /** User-controlled opt-in for the AI features (V2.9). */
  @Patch(':id/ai-consent')
  async setAiConsent(
    @Param('id') targetId: string,
    @Body() body: { consent: boolean },
    @Req() req: any,
    @CurrentUser() user: any,
  ) {
    // A user can only change their own consent — admins included, to keep it
    // an authenticated, deliberate act by the data subject.
    if (user.id !== targetId) {
      throw new ForbiddenException(
        'Seul le titulaire du compte peut modifier son consentement IA.',
      );
    }
    const consent = !!body?.consent;

    // Two writes in one transaction: current state + append-only history row.
    // The history is the source of truth for compliance; the boolean is a cache.
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetId },
        data: {
          aiProcessingConsent: consent,
          aiProcessingConsentAt: consent ? new Date() : null,
        },
        select: { aiProcessingConsent: true, aiProcessingConsentAt: true },
      }),
      this.prisma.userConsent.create({
        data: {
          userId: targetId,
          purpose: 'ai_processing',
          granted: consent,
          ip: req?.ip ?? null,
          userAgent: (req?.headers?.['user-agent'] as string | undefined) ?? null,
        },
      }),
    ]);

    this.audit.log({
      action: consent ? 'AI_CONSENT_GRANTED' : 'AI_CONSENT_REVOKED',
      entity: 'user',
      entityId: targetId,
      userId: user.id,
      companyId: user.companyId ?? null,
    });
    return {
      consent: updated.aiProcessingConsent,
      grantedAt: updated.aiProcessingConsentAt?.toISOString() ?? null,
    };
  }

  /** History of consent events (for the data subject or admin audit). */
  @Get(':id/consent-history')
  async getConsentHistory(
    @Param('id') targetId: string,
    @CurrentUser() user: any,
  ) {
    if (user.id !== targetId && user.role !== 'admin') {
      throw new ForbiddenException(
        "Historique accessible uniquement au titulaire du compte ou à un administrateur.",
      );
    }
    const events = await this.prisma.userConsent.findMany({
      where: { userId: targetId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return events.map((e) => ({
      id: e.id,
      purpose: e.purpose,
      granted: e.granted,
      ip: e.ip,
      userAgent: e.userAgent,
      at: e.createdAt.toISOString(),
    }));
  }

  @Get(':id/gdpr-export')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async exportPersonalData(
    @Param('id') targetId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const isSelf = user.id === targetId;
    const isAdmin = user.role === 'admin';
    if (!isSelf && !isAdmin) {
      throw new ForbiddenException(
        'Accès refusé — vous ne pouvez exporter que vos propres données.',
      );
    }

    const payload = await this.gdpr.exportUser(targetId);

    this.audit.log({
      action: 'GDPR_EXPORT',
      entity: 'user',
      entityId: targetId,
      userId: user.id,
      companyId: user.companyId ?? null,
    });

    const filename = `gdpr-export-${targetId}-${new Date().toISOString().slice(0, 10)}.json`;
    res.set({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(JSON.stringify(payload, null, 2));
  }

  @Delete(':id/gdpr-erase')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async erasePersonalData(
    @Param('id') targetId: string,
    @CurrentUser() user: any,
  ) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Seul un administrateur peut exécuter un effacement RGPD.',
      );
    }

    // Guard against self-erasure — an admin erasing themselves locks everyone
    // out of the tenant. Force a second admin to be involved.
    if (user.id === targetId) {
      throw new ForbiddenException(
        "Impossible d'anonymiser votre propre compte. Demandez à un autre administrateur.",
      );
    }

    const result = await this.gdpr.eraseUser(targetId);

    this.audit.log({
      action: 'GDPR_ERASE',
      entity: 'user',
      entityId: targetId,
      userId: user.id,
      companyId: user.companyId ?? null,
      after: { erasedAt: result.erasedAt },
    });

    return { success: true, erasedAt: result.erasedAt };
  }
}
