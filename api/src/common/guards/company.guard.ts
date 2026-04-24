import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Resolves X-Company-Id header (ASP|JS|GROUP) to a companyId or null.
 * Attaches `req.companyId` (string | null) for use in services.
 *
 * Rules:
 * - GROUP → null (no filter) → admin only
 * - ASP/JS → resolved to company DB id; admin may target any, others must match their own
 * - No header → default to user's own companyId
 */
@Injectable()
export class CompanyGuard implements CanActivate {
  // In-memory cache: code → id
  private companyCache = new Map<string, string>();

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const headerValue = (
      request.headers['x-company-id'] as string || ''
    ).toUpperCase();

    // Explicit GROUP scope — admin only.
    if (headerValue === 'GROUP') {
      if (user.role !== 'admin') {
        throw new ForbiddenException(
          'GROUP scope is reserved for admin role',
        );
      }
      request.companyId = null;
      request.companyScope = 'GROUP';
      return true;
    }

    // No header → always default to user's own company, whatever the role.
    if (headerValue === '') {
      request.companyId = user.companyId;
      request.companyScope = 'OWN';
      return true;
    }

    // Specific company code (ASP / JS / …).
    const resolvedId = await this.resolveCompanyId(headerValue);
    if (!resolvedId) {
      throw new ForbiddenException(`Unknown company code: ${headerValue}`);
    }

    // Only admin may target a company other than their own.
    if (resolvedId !== user.companyId && user.role !== 'admin') {
      throw new ForbiddenException('Cannot access another company');
    }

    request.companyId = resolvedId;
    request.companyScope = 'COMPANY';
    return true;
  }

  private async resolveCompanyId(code: string): Promise<string | null> {
    if (this.companyCache.has(code)) {
      return this.companyCache.get(code)!;
    }
    const company = await this.prisma.company.findFirst({
      where: { code: code as any },
      select: { id: true },
    });
    if (company) {
      this.companyCache.set(code, company.id);
      return company.id;
    }
    return null;
  }
}
