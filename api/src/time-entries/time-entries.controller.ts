import { Controller, Get, Post, Patch, Param, Body, Query, Req, ForbiddenException, UseInterceptors } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto, UpdateTimeEntryDto } from './dto/create-time-entry.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { IsArray, IsString } from 'class-validator';

class SubmitDto {
  @IsArray() @IsString({ each: true }) ids: string[];
}

@Controller('api/time-entries')
@Roles('admin', 'conducteur', 'technicien')
export class TimeEntriesController {
  constructor(private timeEntriesService: TimeEntriesService) {}

  @Get()
  findAll(@Req() req: any, @Query() pagination: PaginationDto, @CurrentUser() user: any) {
    return this.timeEntriesService.findAll(req.companyId, pagination, user.id, user.role);
  }

  @Post()
  @Roles('admin', 'conducteur', 'technicien')
  @UseInterceptors(IdempotencyInterceptor)
  create(@Body() dto: CreateTimeEntryDto, @CurrentUser() user: any, @Req() req: any) {
    const companyId = req.companyId || user.companyId;
    return this.timeEntriesService.create(dto, user.id, companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTimeEntryDto, @CurrentUser() user: any) {
    return this.timeEntriesService.update(id, dto, user.id, user.role);
  }

  @Post('submit')
  submit(@Body() dto: SubmitDto, @CurrentUser('id') userId: string) {
    return this.timeEntriesService.submit(dto.ids, userId);
  }

  @Post('approve-batch')
  @Roles('admin', 'conducteur')
  approveBatch(@Body() dto: SubmitDto, @CurrentUser('id') userId: string) {
    return this.timeEntriesService.approveBatch(dto.ids, userId);
  }

  @Post(':id/approve')
  @Roles('admin', 'conducteur')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.timeEntriesService.approve(id, userId);
  }

  @Post(':id/reject')
  @Roles('admin', 'conducteur')
  reject(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.timeEntriesService.reject(id, userId);
  }
}
