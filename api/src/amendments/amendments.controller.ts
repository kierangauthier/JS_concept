import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { AmendmentsService } from './amendments.service';
import { CreateAmendmentDto, UpdateAmendmentDto, UpdateAmendmentStatusDto } from './dto/create-amendment.dto';

@Controller('api')
@Roles('admin', 'conducteur')
export class AmendmentsController {
  constructor(private amendmentsService: AmendmentsService) {}

  @Get('quotes/:quoteId/amendments')
  findByQuote(@Param('quoteId') quoteId: string, @Req() req: any) {
    return this.amendmentsService.findByQuote(quoteId, req.companyId);
  }

  @Post('quotes/:quoteId/amendments')
  create(
    @Param('quoteId') quoteId: string,
    @Body() dto: CreateAmendmentDto,
    @Req() req: any,
  ) {
    return this.amendmentsService.create(quoteId, dto, req.companyId);
  }

  @Get('amendments/:id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.amendmentsService.findOne(id, req.companyId);
  }

  @Patch('amendments/:id')
  update(@Param('id') id: string, @Body() dto: UpdateAmendmentDto, @Req() req: any) {
    return this.amendmentsService.update(id, dto, req.companyId);
  }

  @Patch('amendments/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAmendmentStatusDto, @Req() req: any) {
    return this.amendmentsService.updateStatus(id, dto, req.companyId);
  }

  @Delete('amendments/:id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.amendmentsService.remove(id, req.companyId);
  }
}
