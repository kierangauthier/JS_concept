import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutations
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((responseData) => {
        if (!responseData) return;

        const entityId =
          responseData?.id || request.params?.id || 'unknown';
        const entity =
          request.route?.path
            ?.replace('/api/', '')
            ?.split('/')[0] || 'unknown';

        const action =
          method === 'POST'
            ? 'CREATE'
            : method === 'DELETE'
              ? 'DELETE'
              : 'UPDATE';

        this.auditService.log({
          action,
          entity,
          entityId: String(entityId),
          before: request._auditBefore ?? null,
          after: responseData ?? null,
          userId: request.user?.id,
          companyId: request.companyId,
          ip: request.ip,
          userAgent: request.headers?.['user-agent'],
        });
      }),
    );
  }
}
