import { Controller, Get, Post, Patch, Param, Body, Query, Req, ForbiddenException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/create-supplier.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/vendors')
@Roles('admin', 'conducteur')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  findAll(@Req() req: any, @Query() pagination: PaginationDto) {
    return this.suppliersService.findAll(req.companyId, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.suppliersService.findOne(id, req.companyId);
  }

  @Post()
  create(@Body() dto: CreateSupplierDto, @Req() req: any) {
    if (!req.companyId) throw new ForbiddenException('Cannot create under GROUP scope');
    return this.suppliersService.create(dto, req.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @Req() req: any) {
    return this.suppliersService.update(id, dto, req.companyId);
  }
}
