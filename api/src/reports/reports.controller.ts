import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/reports')
@Roles('admin', 'conducteur')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('hours')
  getHoursReport(
    @Query('weekOf') weekOf: string,
    @Query('groupBy') groupBy: string,
    @Req() req: any,
  ) {
    return this.reportsService.getHoursReport(
      req.companyId,
      weekOf || new Date().toISOString().slice(0, 10),
      (groupBy === 'job' ? 'job' : 'user') as 'user' | 'job',
    );
  }

  @Get('hours/export')
  async exportHoursCsv(
    @Query('weekOf') weekOf: string,
    @Query('groupBy') groupBy: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const csv = await this.reportsService.exportHoursCsv(
      req.companyId,
      weekOf || new Date().toISOString().slice(0, 10),
      (groupBy === 'job' ? 'job' : 'user') as 'user' | 'job',
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=rapport-heures-${weekOf}.csv`);
    res.send('\uFEFF' + csv); // BOM for Excel
  }
}
