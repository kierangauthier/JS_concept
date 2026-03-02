import { Controller, Post, Get, Body, Query, Req, ForbiddenException } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { SignaturesService } from './signatures.service';
import { CreateSignatureDto } from './dto/create-signature.dto';

@Controller('api/signatures')
@Roles('admin', 'conducteur', 'technicien')
export class SignaturesController {
  constructor(private signaturesService: SignaturesService) {}

  @Post()
  create(@Body() dto: CreateSignatureDto, @Req() req: any) {
    if (!req.companyId) throw new ForbiddenException('Cannot sign under GROUP scope');
    return this.signaturesService.create(dto, req.companyId);
  }

  @Get()
  getByJob(@Query('jobId') jobId: string, @Req() req: any) {
    return this.signaturesService.getByJob(jobId, req.companyId);
  }
}
