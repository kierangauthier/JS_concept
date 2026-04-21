import { Controller, Get, Post, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { AbsencesService } from './absences.service';
import { CreateAbsenceDto, CreateAbsenceTypeDto } from './dto/create-absence.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/absences')
@Roles('admin', 'conducteur', 'technicien')
export class AbsencesController {
  constructor(private absencesService: AbsencesService) {}

  @Get()
  findAll(@Req() req: any, @Query('status') status?: string) {
    return this.absencesService.findAll(req.companyId, status);
  }

  @Post()
  create(@Body() dto: CreateAbsenceDto, @CurrentUser() user: any, @Req() req: any) {
    const companyId = req.companyId || user.companyId;
    return this.absencesService.create(dto, user.id, companyId);
  }

  @Post(':id/approve')
  @Roles('admin', 'conducteur')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string, @Req() req: any) {
    return this.absencesService.approve(id, userId, req.companyId);
  }

  @Post(':id/reject')
  @Roles('admin', 'conducteur')
  reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: any,
    @Body() body: { reason?: string },
  ) {
    return this.absencesService.reject(id, userId, req.companyId, body?.reason);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.absencesService.remove(id, user.id, user.role);
  }

  @Get('types')
  getTypes(@Req() req: any) {
    return this.absencesService.getTypes(req.companyId);
  }

  @Post('types')
  @Roles('admin')
  createType(@Body() dto: CreateAbsenceTypeDto, @Req() req: any) {
    return this.absencesService.createType(dto, req.companyId);
  }
}
