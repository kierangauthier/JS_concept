import { Controller, Get, Post, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { TeamPlanningService } from './team-planning.service';
import { CreateTeamSlotDto, WeekActionDto } from './dto/team-planning.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/team-planning')
@Roles('admin', 'conducteur')
export class TeamPlanningController {
  constructor(private service: TeamPlanningService) {}

  @Get()
  getWeek(@Req() req: any, @Query('weekStart') weekStart: string) {
    return this.service.getWeek(req.companyId, weekStart);
  }

  @Post('slots')
  createSlot(@Body() dto: CreateTeamSlotDto, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.service.createSlot(dto, req.companyId, userId);
  }

  @Delete('slots/:id')
  deleteSlot(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteSlot(id, req.companyId);
  }

  @Post('lock')
  lockWeek(@Body() dto: WeekActionDto, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.service.lockWeek(req.companyId, dto.weekStart, userId);
  }

  @Post('unlock')
  @Roles('admin')
  unlockWeek(@Body() dto: WeekActionDto, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.service.unlockWeek(req.companyId, dto.weekStart, userId);
  }

  @Post('send')
  sendPlanning(@Body() dto: WeekActionDto, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.service.sendPlanning(req.companyId, dto.weekStart, userId);
  }

  @Get('my')
  @Roles('admin', 'conducteur', 'technicien')
  getMyPlanning(@CurrentUser('id') userId: string, @Query('weekStart') weekStart: string) {
    return this.service.getMyPlanning(userId, weekStart);
  }

  @Post('copy-week')
  copyWeek(
    @Body() dto: { sourceWeekStart: string; targetWeekStart: string },
    @Req() req: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.copyWeek(req.companyId, dto.sourceWeekStart, dto.targetWeekStart, userId);
  }
}
