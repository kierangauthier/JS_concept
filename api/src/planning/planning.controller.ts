import { Controller, Get, Post, Delete, Param, Body, Query, Req, ForbiddenException } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { CreatePlanningSlotDto, BulkCreatePlanningSlotDto } from './dto/planning-slot.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/planning-slots')
@Roles('admin', 'conducteur', 'technicien')
export class PlanningController {
  constructor(private planningService: PlanningService) {}

  @Get()
  findByWeek(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.planningService.findByWeek(req.companyId, startDate, endDate);
  }

  @Post()
  @Roles('admin', 'conducteur')
  create(@Body() dto: CreatePlanningSlotDto, @Req() req: any) {
    const companyId = req.companyId;
    if (!companyId) throw new ForbiddenException('Cannot create under GROUP scope');
    return this.planningService.create(dto, companyId);
  }

  @Post('bulk')
  @Roles('admin', 'conducteur')
  bulkCreate(@Body() dto: BulkCreatePlanningSlotDto, @Req() req: any) {
    const companyId = req.companyId;
    if (!companyId) throw new ForbiddenException('Cannot create under GROUP scope');
    return this.planningService.bulkCreate(dto, companyId);
  }

  @Delete(':id')
  @Roles('admin', 'conducteur')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.planningService.delete(id, req.companyId);
  }
}
