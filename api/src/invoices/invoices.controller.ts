import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, Res, ForbiddenException, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceDto, CreateSituationDto } from './dto/create-invoice.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/invoices')
@Roles('admin', 'comptable')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get('export/csv')
  async exportCsv(@Query('from') from: string, @Query('to') to: string, @Req() req: any, @Res() res: Response) {
    const csv = await this.invoicesService.exportCsv(from, to, req.companyId);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="export-comptable.csv"',
    });
    res.send(csv);
  }

  @Get()
  findAll(@Req() req: any, @Query() pagination: PaginationDto) {
    return this.invoicesService.findAll(req.companyId, pagination);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Req() req: any) {
    const { buffer, reference } = await this.invoicesService.generatePdf(id, req.companyId);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${reference}.pdf"`,
    });
  }

  @Get(':id/integrity')
  checkIntegrity(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.checkIntegrity(id, req.companyId);
  }

  /**
   * Factur-X hybrid PDF/A-3 (the artefact the user actually wants to send).
   * Returns a 422 with the list of missing legal fields when the invoice
   * payload cannot be turned into a compliant document.
   */
  @Get(':id/facturx')
  async downloadFacturX(@Param('id') id: string, @Req() req: any) {
    const { buffer, reference, profile } = await this.invoicesService.generateFacturXPdf(
      id,
      req.companyId,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${reference}.factur-x.${profile.toLowerCase()}.pdf"`,
    });
  }

  /** Escape hatch: serve the CII XML on its own (debugging, PDP ingesters). */
  @Get(':id/facturx.xml')
  async downloadFacturXXml(@Param('id') id: string, @Req() req: any) {
    const { xml, reference, profile } = await this.invoicesService.generateFacturXXml(
      id,
      req.companyId,
    );
    return new StreamableFile(Buffer.from(xml, 'utf-8'), {
      type: 'application/xml; charset=utf-8',
      disposition: `attachment; filename="${reference}.factur-x.${profile.toLowerCase()}.xml"`,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.findOne(id, req.companyId);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    if (!req.companyId) throw new ForbiddenException('Cannot create under GROUP scope');
    return this.invoicesService.create(dto, req.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto, @Req() req: any) {
    return this.invoicesService.update(id, dto, req.companyId);
  }

  @Post(':id/export')
  export(@Param('id') id: string, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.invoicesService.export(id, req.companyId, userId);
  }

  // ─── Situations (factures de situation) ──────────────────────────────────

  @Get(':id/situations')
  getSituations(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.getSituations(id, req.companyId);
  }

  @Post(':id/situations')
  createSituation(@Param('id') id: string, @Body() dto: CreateSituationDto, @Req() req: any) {
    if (!req.companyId) throw new ForbiddenException('Cannot create under GROUP scope');
    return this.invoicesService.createSituation(id, dto, req.companyId);
  }

  @Patch('situations/:situationId/validate')
  validateSituation(@Param('situationId') situationId: string, @Req() req: any) {
    return this.invoicesService.validateSituation(situationId, req.companyId);
  }

  @Delete(':id')
  @Roles('admin')
  softDelete(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.softDelete(id, req.companyId);
  }
}
