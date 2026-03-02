import { Controller, Get, Query, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/dashboard')
@Roles('admin', 'conducteur', 'comptable')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('cashflow')
  getCashflow(@Query('horizon') horizon: string, @Req() req: any) {
    return this.dashboardService.getCashflow(req.companyId, Number(horizon) || 90);
  }
}
