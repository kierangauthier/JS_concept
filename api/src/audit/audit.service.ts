import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId: string;
  before?: any;
  after?: any;
  userId?: string;
  companyId?: string | null;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /** Fire-and-forget audit log. Errors are caught and logged, never thrown. */
  log(entry: AuditEntry): void {
    this.prisma.auditLog
      .create({
        data: {
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          before: entry.before ?? undefined,
          after: entry.after ?? undefined,
          userId: entry.userId ?? null,
          companyId: entry.companyId ?? null,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
        },
      })
      .catch((err) => {
        console.error('AuditLog write failed:', err.message);
      });
  }
}
