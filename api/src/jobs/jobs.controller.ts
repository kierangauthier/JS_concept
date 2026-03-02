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
import { JobsService } from './jobs.service';
import { JobPhotosService } from './job-photos.service';
import { CreateJobDto, UpdateJobDto } from './dto/create-job.dto';
import { PresignJobPhotoDto, CreateJobPhotoDto } from './dto/job-photo.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/jobs')
@Roles('admin', 'conducteur', 'technicien')
export class JobsController {
  constructor(
    private jobsService: JobsService,
    private jobPhotosService: JobPhotosService,
  ) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: any,
  ) {
    return this.jobsService.findAll(
      req.companyId,
      pagination,
      user.id,
      user.role,
    );
  }

  @Get('margins/dashboard')
  @Roles('admin', 'conducteur')
  getDashboardMargins(@Req() req: any) {
    return this.jobsService.getDashboardMargins(req.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.jobsService.findOne(id, req.companyId);
  }

  @Post()
  @Roles('admin', 'conducteur')
  create(@Body() dto: CreateJobDto, @Req() req: any, @CurrentUser('id') userId: string) {
    if (!req.companyId) throw new ForbiddenException('Cannot create under GROUP scope');
    return this.jobsService.create(dto, req.companyId, userId);
  }

  @Patch(':id')
  @Roles('admin', 'conducteur')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.jobsService.update(id, dto, req.companyId, userId);
  }

  @Get(':id/margin')
  @Roles('admin', 'conducteur')
  getMargin(@Param('id') id: string, @Req() req: any) {
    return this.jobsService.getMargin(id, req.companyId);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string, @Req() req: any) {
    return this.jobsService.getTimeline(id, req.companyId);
  }

  @Delete(':id')
  @Roles('admin')
  softDelete(@Param('id') id: string, @Req() req: any) {
    return this.jobsService.softDelete(id, req.companyId);
  }

  // ─── Job Photos ──────────────────────────────────────────────────────────

  @Post(':id/photos/presign')
  presignPhoto(
    @Param('id') jobId: string,
    @Body() dto: PresignJobPhotoDto,
    @Req() req: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobPhotosService.getPresignedUpload(jobId, dto, req.companyId, userId);
  }

  @Post(':id/photos')
  createPhoto(
    @Param('id') jobId: string,
    @Body() dto: CreateJobPhotoDto,
    @Req() req: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobPhotosService.createPhoto(jobId, dto, req.companyId, userId);
  }

  @Get(':id/photos')
  listPhotos(@Param('id') jobId: string, @Req() req: any) {
    return this.jobPhotosService.listPhotos(jobId, req.companyId);
  }

  @Get(':id/photos/:photoId/url')
  getPhotoUrl(@Param('photoId') photoId: string, @Req() req: any) {
    return this.jobPhotosService.getPhotoUrl(photoId, req.companyId);
  }

  @Delete(':id/photos/:photoId')
  @Roles('admin', 'conducteur')
  deletePhoto(
    @Param('id') jobId: string,
    @Param('photoId') photoId: string,
    @Req() req: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobPhotosService.deletePhoto(jobId, photoId, req.companyId, userId);
  }
}
