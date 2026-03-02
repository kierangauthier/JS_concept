import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/create-client.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/clients')
@Roles('admin', 'conducteur')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  findAll(@Req() req: any, @Query() pagination: PaginationDto) {
    return this.clientsService.findAll(req.companyId, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.clientsService.findOne(id, req.companyId);
  }

  @Post()
  create(@Body() dto: CreateClientDto, @Req() req: any) {
    const companyId = req.companyId;
    if (!companyId) {
      throw new ForbiddenException('Cannot create under GROUP scope');
    }
    return this.clientsService.create(dto, companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @Req() req: any,
  ) {
    return this.clientsService.update(id, dto, req.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.clientsService.softDelete(id, req.companyId);
  }
}
