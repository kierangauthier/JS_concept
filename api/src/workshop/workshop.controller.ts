import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, ForbiddenException } from '@nestjs/common';
import { WorkshopService } from './workshop.service';
import { CreateWorkshopItemDto, UpdateWorkshopItemDto } from './dto/create-workshop-item.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/workshop-items')
@Roles('admin', 'conducteur')
export class WorkshopController {
  constructor(private workshopService: WorkshopService) {}

  @Get()
  findAll(@Req() req: any, @Query() pagination: PaginationDto) {
    return this.workshopService.findAll(req.companyId, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.workshopService.findOne(id, req.companyId);
  }

  @Post()
  create(@Body() dto: CreateWorkshopItemDto, @Req() req: any) {
    if (!req.companyId) throw new ForbiddenException('Cannot create under GROUP scope');
    return this.workshopService.create(dto, req.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkshopItemDto, @Req() req: any) {
    return this.workshopService.update(id, dto, req.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.workshopService.softDelete(id, req.companyId);
  }

  @Post(':id/next-step')
  nextStep(@Param('id') id: string, @Req() req: any) {
    return this.workshopService.nextStep(id, req.companyId);
  }
}
