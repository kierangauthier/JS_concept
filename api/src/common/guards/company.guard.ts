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
 * - GROUP → null (no filter) → only admin/conducteur allowed (gérant = conducteur level)
 * - ASP/JS → resolved to company DB id
 * - Non-admin users cannot access a company other than their own
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

    // GROUP scope
    if (headerValue === 'GROUP' || headerValue === '') {
      if (!['admin', 'conducteur'].includes(user.role)) {
        if (headerValue === 'GROUP') {
          throw new ForbiddenException(
            'GROUP scope is reserved for admin/gérant roles',
          );
        }
        // No header → default to user's own company
        request.companyId = user.companyId;
        return true;
      }
      // Admin/conducteur with GROUP or no header → no company filter
      request.companyId = headerValue === 'GROUP' ? null : user.companyId;
      return true;
    }

    // Specific company code (ASP or JS)
    const resolvedId = await this.resolveCompanyId(headerValue);
    if (!resolvedId) {
      throw new ForbiddenException(`Unknown company code: ${headerValue}`);
    }

    // Non-admin/conducteur: must match own company
    if (!['admin', 'conducteur'].includes(user.role)) {
      if (resolvedId !== user.companyId) {
        throw new ForbiddenException('Cannot access another company');
      }
    }

    request.companyId = resolvedId;
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
