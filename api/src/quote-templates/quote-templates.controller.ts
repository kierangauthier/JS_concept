import { Controller, Get, Post, Delete, Param, Body, Req } from '@nestjs/common';
import { QuoteTemplatesService } from './quote-templates.service';
import { CreateFromQuoteDto, CreateQuoteFromTemplateDto } from './dto/quote-template.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/quote-templates')
@Roles('admin', 'conducteur')
export class QuoteTemplatesController {
  constructor(private service: QuoteTemplatesService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.companyId);
  }

  @Post()
  createFromQuote(@Body() dto: CreateFromQuoteDto, @Req() req: any) {
    return this.service.createFromQuote(dto, req.companyId);
  }

  @Post(':id/create-quote')
  createQuoteFromTemplate(
    @Param('id') id: string,
    @Body() dto: CreateQuoteFromTemplateDto,
    @Req() req: any,
  ) {
    return this.service.createQuoteFromTemplate(id, dto, req.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.companyId);
  }
}
