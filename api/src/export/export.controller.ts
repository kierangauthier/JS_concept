import { Controller, Get, Patch, Query, Body, Req, Res, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api')
@Roles('admin', 'comptable')
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('export/fec')
  async exportFec(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('journal') journal: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (!req.companyId) throw new ForbiddenException('Export requires company scope');
    const j = (journal === 'VE' || journal === 'AC') ? journal : 'ALL';
    const csv = await this.exportService.generateFec(req.companyId, from, to, j as any);
    const filename = `FEC-${j}-${from}-${to}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send('\uFEFF' + csv); // UTF-8 BOM for Excel
  }

  @Get('export/sage')
  async exportSage(
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (!req.companyId) throw new ForbiddenException('Export requires company scope');
    const csv = await this.exportService.generateSage(req.companyId, from, to);
    const filename = `Sage-${from}-${to}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send('\uFEFF' + csv);
  }

  @Get('export/ebp')
  async exportEbp(
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (!req.companyId) throw new ForbiddenException('Export requires company scope');
    const csv = await this.exportService.generateEbp(req.companyId, from, to);
    const filename = `EBP-${from}-${to}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send('\uFEFF' + csv);
  }

  @Get('settings/accounting')
  async getSettings(@Req() req: any) {
    if (!req.companyId) throw new ForbiddenException('Requires company scope');
    return this.exportService.getAccountingSettings(req.companyId);
  }

  @Patch('settings/accounting')
  @Roles('admin')
  async updateSettings(@Req() req: any, @Body() body: any) {
    if (!req.companyId) throw new ForbiddenException('Requires company scope');
    return this.exportService.updateAccountingSettings(req.companyId, body);
  }
}
