import { Controller, Get, Post, Patch, Param, Body, Query, Req, ForbiddenException } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto, UpdatePurchaseDto } from './dto/create-purchase.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/purchase-orders')
@Roles('admin', 'conducteur')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Get()
  findAll(@Req() req: any, @Query() pagination: PaginationDto) {
    return this.purchasesService.findAll(req.companyId, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.purchasesService.findOne(id, req.companyId);
  }

  @Post()
  create(@Body() dto: CreatePurchaseDto, @Req() req: any) {
    if (!req.companyId) throw new ForbiddenException('Cannot create under GROUP scope');
    return this.purchasesService.create(dto, req.companyId);
  }

  @Post(':id/mark-ordered')
  markOrdered(@Param('id') id: string, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.purchasesService.markOrdered(id, req.companyId, userId);
  }

  @Post(':id/mark-received')
  markReceived(@Param('id') id: string, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.purchasesService.markReceived(id, req.companyId, userId);
  }
}
