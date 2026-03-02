import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ActivityLogsController } from './activity-logs.controller';
import { AttachmentsController } from './attachments.controller';

@Global()
@Module({
  controllers: [ActivityLogsController, AttachmentsController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
