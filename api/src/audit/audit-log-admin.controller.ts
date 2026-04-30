import { Controller, Get, Query, Req, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * Admin-only read access to the immutable audit_logs table (the same trail
 * populated by AuditLogInterceptor + explicit AuditService.log() calls in
 * GDPR / AI consent / planning copy / quote-status / etc.).
 *
 * Scope rules:
 *  - tenant admins see only their own companyId rows
 *  - group admins (Acreed cross-tenant) see all rows + the rows where
 *    companyId is null (system / cross-tenant actions)
 *  - the controller never returns the raw `before`/`after` JSON to the wire —
 *    only their key counts. Full payload inspection requires DB access (audit
 *    integrity guarantee + avoids leaking PII through the admin UI).
 *
 * Read-only by design — no PATCH/POST/DELETE handlers in this file. The
 * audit_logs table itself has no updatedAt and is treated as append-only.
 */
@Controller('api/admin/audit-log')
@Roles('admin')
export class AuditLogAdminController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('action') action: string | undefined,
    @Query('entity') entity: string | undefined,
    @Query('limit') limitRaw: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Req() req: any,
  ) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Authentification requise');

    const where: any = {};

    // Tenant scope: a regular admin sees only their tenant. Group admins see
    // everything including null-company rows (cross-tenant access trail —
    // exactly what the buyer asks to be able to audit).
    if (!user.isGroupAdmin) {
      where.companyId = user.companyId;
    }

    if (from) where.createdAt = { ...(where.createdAt || {}), gte: new Date(from) };
    if (to) where.createdAt = { ...(where.createdAt || {}), lte: new Date(to) };
    if (action) where.action = action;
    if (entity) where.entity = entity;

    const limit = Math.min(Math.max(parseInt(limitRaw ?? '50', 10) || 50, 1), 200);

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((r) => ({
        id: r.id,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        userId: r.userId,
        userName: r.user?.name ?? null,
        userEmail: r.user?.email ?? null,
        companyId: r.companyId,
        ip: r.ip,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(),
        // Counts only — never expose raw before/after through the admin UI.
        beforeKeys: r.before && typeof r.before === 'object' ? Object.keys(r.before as object).length : 0,
        afterKeys: r.after && typeof r.after === 'object' ? Object.keys(r.after as object).length : 0,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  @Get('actions')
  async listActions(@Req() req: any) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Authentification requise');
    const where: any = {};
    if (!user.isGroupAdmin) where.companyId = user.companyId;

    const rows = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { _all: true },
      orderBy: { _count: { action: 'desc' } },
    });
    return rows.map((r) => ({ action: r.action, count: r._count._all }));
  }
}
