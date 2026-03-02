import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const key = request.headers['x-idempotency-key'];

    // Only apply to POST/PATCH with idempotency key and authenticated user
    if (!key || request.method === 'GET') return next.handle();

    const userId = request.user?.id;
    if (!userId) return next.handle(); // Skip if no authenticated user

    const companyId = request.headers['x-company-id'] ?? request.companyId;
    if (!companyId) return next.handle(); // Skip if no company scope
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(request.body ?? {}))
      .digest('hex');

    // Check if already processed
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: {
        key_userId_companyId: { key, userId, companyId },
      },
    });

    if (existing) {
      if (existing.payloadHash === payloadHash) {
        // Return cached response with original status code
        response.status(existing.statusCode);
        return of(existing.responseBody);
      }
      throw new ConflictException(
        'Idempotency key reused with different payload',
      );
    }

    // Execute and store
    return next.handle().pipe(
      tap(async (responseBody) => {
        const statusCode = response.statusCode;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.prisma.idempotencyKey
          .create({
            data: {
              key,
              userId,
              companyId,
              payloadHash,
              statusCode,
              responseBody: responseBody ?? null,
              expiresAt,
            },
          })
          .catch(() => {
            // Ignore duplicate key errors (race condition)
          });
      }),
    );
  }
}
