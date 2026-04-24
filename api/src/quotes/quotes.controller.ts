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
  StreamableFile,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/create-quote.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/quotes')
@Roles('admin', 'conducteur')
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Get()
  findAll(@Req() req: any, @Query() pagination: PaginationDto) {
    return this.quotesService.findAll(req.companyId, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.quotesService.findOne(id, req.companyId);
  }

  @Post()
  create(@Body() dto: CreateQuoteDto, @Req() req: any, @CurrentUser('id') userId: string) {
    if (!req.companyId) throw new ForbiddenException('Cannot create under GROUP scope');
    return this.quotesService.create(dto, req.companyId, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.quotesService.update(id, dto, req.companyId, userId);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Req() req: any) {
    const { buffer, reference } = await this.quotesService.generatePdf(id, req.companyId);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${reference}.pdf"`,
    });
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Req() req: any) {
    return this.quotesService.duplicate(id, req.companyId);
  }

  @Post(':id/convert-to-job')
  convertToJob(
    @Param('id') id: string,
    @Body() body: { jobAddress?: string },
    @Req() req: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotesService.convertToJob(id, req.companyId, userId, body?.jobAddress);
  }

  @Post(':id/convert-full')
  convertFull(
    @Param('id') id: string,
    @Body() body: { createWorkshop?: boolean; createPurchases?: boolean; jobAddress?: string },
    @Req() req: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotesService.convertFull(id, req.companyId, userId, body);
  }

  @Delete(':id')
  @Roles('admin')
  softDelete(@Param('id') id: string, @Req() req: any) {
    return this.quotesService.softDelete(id, req.companyId);
  }
}
