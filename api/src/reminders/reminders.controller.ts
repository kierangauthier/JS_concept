import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { CreateReminderRuleDto, UpdateReminderRuleDto } from './dto/create-reminder-rule.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/reminders')
@Roles('admin', 'conducteur', 'comptable')
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  // ─── Rules CRUD ──────────────────────────────────────────────────────────

  @Get('rules')
  getRules(@Req() req: any) {
    return this.remindersService.getRules(req.companyId);
  }

  @Post('rules')
  @Roles('admin')
  createRule(@Body() dto: CreateReminderRuleDto, @Req() req: any) {
    return this.remindersService.createRule(dto, req.companyId);
  }

  @Patch('rules/:id')
  @Roles('admin')
  updateRule(@Param('id') id: string, @Body() dto: UpdateReminderRuleDto, @Req() req: any) {
    return this.remindersService.updateRule(id, dto, req.companyId);
  }

  @Delete('rules/:id')
  @Roles('admin')
  deleteRule(@Param('id') id: string, @Req() req: any) {
    return this.remindersService.deleteRule(id, req.companyId);
  }

  // ─── Logs ────────────────────────────────────────────────────────────────

  @Get('invoices/:invoiceId/logs')
  getLogs(@Param('invoiceId') invoiceId: string) {
    return this.remindersService.getLogsByInvoice(invoiceId);
  }

  // ─── Manual trigger ──────────────────────────────────────────────────────

  @Post('run')
  @Roles('admin')
  run(@CurrentUser('id') userId: string, @Req() req: any) {
    return this.remindersService.processOverdue(req.companyId, userId);
  }
}
