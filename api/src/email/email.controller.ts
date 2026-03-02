import { Controller, Post, Get, Body, Query, Req, ForbiddenException } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';

@Controller('api/email')
@Roles('admin', 'conducteur', 'comptable')
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Post('send')
  send(@Body() dto: SendEmailDto, @Req() req: any, @CurrentUser('id') userId: string) {
    if (!req.companyId) throw new ForbiddenException('Cannot send email under GROUP scope');
    return this.emailService.sendEntityEmail(dto, req.companyId, userId);
  }

  @Get('logs')
  getLogs(@Query('entityType') entityType: string, @Query('entityId') entityId: string) {
    return this.emailService.getEmailLogs(entityType, entityId);
  }
}
