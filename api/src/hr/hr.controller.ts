import { Controller, Get, Post, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { HrService } from './hr.service';
import { PresignUploadDto, CreateDocumentDto } from './dto/hr.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/hr')
@Roles('admin', 'conducteur')
export class HrController {
  constructor(private hrService: HrService) {}

  @Post('docs/presign')
  presignUpload(@Body() dto: PresignUploadDto, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.hrService.getPresignedUpload(dto, req.companyId, userId);
  }

  @Post('docs')
  createDocument(@Body() dto: CreateDocumentDto, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.hrService.createDocument(dto, req.companyId, userId);
  }

  @Get('users/:id/docs')
  listDocuments(@Param('id') targetUserId: string, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.hrService.listDocuments(targetUserId, req.companyId, userId);
  }

  @Get('docs/:id/download')
  downloadDocument(@Param('id') docId: string, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.hrService.getPresignedDownload(docId, req.companyId, userId);
  }

  @Delete('docs/:id')
  deleteDocument(@Param('id') docId: string, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.hrService.deleteDocument(docId, req.companyId, userId);
  }

  @Get('users/:id/activity')
  getUserActivity(
    @Param('id') targetUserId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: any,
  ) {
    return this.hrService.getUserActivity(targetUserId, req.companyId, from, to);
  }

  @Get('certification-matrix')
  getCertificationMatrix(@Req() req: any) {
    return this.hrService.getCertificationMatrix(req.companyId);
  }
}
