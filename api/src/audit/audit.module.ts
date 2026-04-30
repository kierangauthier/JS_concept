import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ActivityLogsController } from './activity-logs.controller';
import { AttachmentsController } from './attachments.controller';
import { AuditLogAdminController } from './audit-log-admin.controller';

@Global()
@Module({
  controllers: [ActivityLogsController, AttachmentsController, AuditLogAdminController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
