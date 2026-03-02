import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MinioService } from '../hr/minio.service';
import { PresignJobPhotoDto, CreateJobPhotoDto } from './dto/job-photo.dto';

@Injectable()
export class JobPhotosService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private minio: MinioService,
  ) {}

  private static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'image/heic',
  ];

  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

  async getPresignedUpload(jobId: string, dto: PresignJobPhotoDto, companyId: string, userId: string) {
    if (!companyId) throw new ForbiddenException('Cannot upload under GROUP scope');

    // Verify job exists and belongs to company
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, ...(companyId ? { companyId } : {}) },
    });
    if (!job) throw new NotFoundException('Chantier introuvable');

    // Validate MIME type
    if (!JobPhotosService.ALLOWED_MIME_TYPES.includes(dto.contentType)) {
      throw new BadRequestException(
        `Type de fichier "${dto.contentType}" non autorisé. Types autorisés : ${JobPhotosService.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Sanitize filename
    const safeName = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `jobs/${companyId}/${jobId}/photos/${Date.now()}-${safeName}`;
    const uploadUrl = await this.minio.getPresignedPutUrl(storageKey, dto.contentType);

    this.audit.log({
      action: 'JOB_PHOTO_PRESIGN',
      entity: 'attachment',
      entityId: jobId,
      after: { storageKey, filename: dto.filename },
      userId,
      companyId,
    });

    return { uploadUrl, storageKey };
  }

  async createPhoto(jobId: string, dto: CreateJobPhotoDto, companyId: string, userId: string) {
    if (!companyId) throw new ForbiddenException('Cannot create under GROUP scope');

    // Verify job exists
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, ...(companyId ? { companyId } : {}) },
    });
    if (!job) throw new NotFoundException('Chantier introuvable');

    if (dto.sizeBytes > JobPhotosService.MAX_FILE_SIZE) {
      throw new BadRequestException(`Le fichier dépasse la taille maximale de ${JobPhotosService.MAX_FILE_SIZE / (1024 * 1024)}Mo`);
    }

    const attachment = await this.prisma.attachment.create({
      data: {
        name: dto.filename,
        mimeType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        storageKey: dto.storageKey,
        jobId,
        uploadedBy: userId,
      },
    });

    this.audit.log({
      action: 'JOB_PHOTO_CREATE',
      entity: 'attachment',
      entityId: attachment.id,
      after: { jobId, filename: dto.filename },
      userId,
      companyId,
    });

    return this.mapPhoto(attachment);
  }

  async listPhotos(jobId: string, companyId: string | null) {
    // Verify job exists
    const where: any = { id: jobId };
    if (companyId) where.companyId = companyId;

    const job = await this.prisma.job.findFirst({ where });
    if (!job) throw new NotFoundException('Chantier introuvable');

    const photos = await this.prisma.attachment.findMany({
      where: {
        jobId,
        mimeType: { startsWith: 'image/' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return photos.map((p) => this.mapPhoto(p));
  }

  async getPhotoUrl(photoId: string, companyId: string | null) {
    const photo = await this.prisma.attachment.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Photo introuvable');

    const downloadUrl = await this.minio.getPresignedGetUrl(photo.storageKey);
    return { downloadUrl };
  }

  async deletePhoto(jobId: string, photoId: string, companyId: string | null, userId: string) {
    if (!companyId) throw new ForbiddenException('Cannot delete under GROUP scope');

    const photo = await this.prisma.attachment.findFirst({
      where: { id: photoId, jobId },
    });
    if (!photo) throw new NotFoundException('Photo introuvable');

    // Delete from MinIO
    try {
      await this.minio.deleteObject(photo.storageKey);
    } catch (err: any) {
      console.error(`[JobPhotos] Failed to delete MinIO object: ${err.message}`);
    }

    // Delete from DB
    await this.prisma.attachment.delete({ where: { id: photoId } });

    this.audit.log({
      action: 'JOB_PHOTO_DELETE',
      entity: 'attachment',
      entityId: photoId,
      before: { jobId, filename: photo.name },
      userId,
      companyId,
    });

    return { deleted: true };
  }

  private mapPhoto(p: any) {
    return {
      id: p.id,
      jobId: p.jobId,
      filename: p.name,
      contentType: p.mimeType,
      sizeBytes: p.sizeBytes,
      storageKey: p.storageKey,
      uploadedBy: p.uploadedBy,
      uploadedAt: p.createdAt.toISOString(),
    };
  }
}
