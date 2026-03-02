import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MinioService } from './minio.service';
import { PresignUploadDto, CreateDocumentDto } from './dto/hr.dto';

@Injectable()
export class HrService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private minio: MinioService,
  ) {}

  // ─── Presigned upload ─────────────────────────────────────────────────────

  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  async getPresignedUpload(dto: PresignUploadDto, companyId: string, userId: string) {
    if (!companyId) throw new ForbiddenException('Cannot upload under GROUP scope');

    // Validate MIME type
    if (!HrService.ALLOWED_MIME_TYPES.includes(dto.contentType)) {
      throw new BadRequestException(
        `File type "${dto.contentType}" is not allowed. Allowed types: ${HrService.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate file size (if provided in DTO)
    if ((dto as any).sizeBytes && (dto as any).sizeBytes > HrService.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds the maximum allowed size of ${HrService.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }

    // Sanitize filename
    const safeName = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `hr/${companyId}/${dto.userId}/${dto.type}/${Date.now()}-${safeName}`;
    const uploadUrl = await this.minio.getPresignedPutUrl(storageKey, dto.contentType);

    this.audit.log({
      action: 'HR_DOC_UPLOAD',
      entity: 'hr_document',
      entityId: 'presign',
      after: { storageKey, userId: dto.userId, type: dto.type },
      userId,
      companyId,
    });

    return { uploadUrl, storageKey };
  }

  // ─── Create document metadata ─────────────────────────────────────────────

  async createDocument(dto: CreateDocumentDto, companyId: string, uploadedByUserId: string) {
    if (!companyId) throw new ForbiddenException('Cannot create under GROUP scope');

    const doc = await this.prisma.hrDocument.create({
      data: {
        userId: dto.userId,
        companyId,
        type: dto.type,
        label: dto.label,
        storageKey: dto.storageKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        purpose: dto.purpose,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        retentionUntil: dto.retentionUntil ? new Date(dto.retentionUntil) : null,
        uploadedByUserId,
      },
    });

    this.audit.log({
      action: 'HR_DOC_UPLOAD',
      entity: 'hr_document',
      entityId: doc.id,
      after: { type: dto.type, label: dto.label, userId: dto.userId },
      userId: uploadedByUserId,
      companyId,
    });

    return this.mapDoc(doc);
  }

  // ─── List documents ───────────────────────────────────────────────────────

  async listDocuments(targetUserId: string, companyId: string | null, requestUserId: string) {
    const where: any = { userId: targetUserId };
    if (companyId) where.companyId = companyId;

    const docs = await this.prisma.hrDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    this.audit.log({
      action: 'HR_DOC_LIST',
      entity: 'hr_document',
      entityId: targetUserId,
      after: { count: docs.length },
      userId: requestUserId,
      companyId,
    });

    return docs.map((d) => this.mapDoc(d));
  }

  // ─── Presigned download ───────────────────────────────────────────────────

  async getPresignedDownload(docId: string, companyId: string | null, requestUserId: string) {
    const doc = await this.prisma.hrDocument.findUnique({ where: { id: docId } });
    if (!doc) {
      // Still log the attempt
      this.audit.log({
        action: 'HR_DOC_DOWNLOAD',
        entity: 'hr_document',
        entityId: docId,
        after: { error: 'not_found' },
        userId: requestUserId,
        companyId,
      });
      throw new NotFoundException('Document not found');
    }

    if (companyId && doc.companyId !== companyId) {
      this.audit.log({
        action: 'HR_DOC_DOWNLOAD',
        entity: 'hr_document',
        entityId: docId,
        after: { error: 'wrong_company' },
        userId: requestUserId,
        companyId,
      });
      throw new NotFoundException('Document not found');
    }

    let downloadUrl: string;
    try {
      downloadUrl = await this.minio.getPresignedGetUrl(doc.storageKey);
    } catch (err: any) {
      this.audit.log({
        action: 'HR_DOC_DOWNLOAD',
        entity: 'hr_document',
        entityId: docId,
        after: { error: `presign_failed: ${err.message}` },
        userId: requestUserId,
        companyId,
      });
      throw err;
    }

    this.audit.log({
      action: 'HR_DOC_DOWNLOAD',
      entity: 'hr_document',
      entityId: docId,
      after: { label: doc.label, type: doc.type },
      userId: requestUserId,
      companyId,
    });

    return { downloadUrl };
  }

  // ─── Delete document ──────────────────────────────────────────────────────

  async deleteDocument(docId: string, companyId: string | null, requestUserId: string) {
    if (!companyId) throw new ForbiddenException('Cannot delete under GROUP scope');

    const doc = await this.prisma.hrDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Document not found');
    if (companyId && doc.companyId !== companyId) throw new NotFoundException('Document not found');

    // Delete from MinIO
    try {
      await this.minio.deleteObject(doc.storageKey);
    } catch (err: any) {
      console.error(`[HR] Failed to delete MinIO object: ${err.message}`);
    }

    // Delete from DB
    await this.prisma.hrDocument.delete({ where: { id: docId } });

    this.audit.log({
      action: 'HR_DOC_DELETE',
      entity: 'hr_document',
      entityId: docId,
      before: { type: doc.type, label: doc.label, userId: doc.userId },
      userId: requestUserId,
      companyId,
    });

    return { deleted: true };
  }

  // ─── User activity (planned + actual) ─────────────────────────────────────

  async getUserActivity(targetUserId: string, companyId: string | null, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Planned: via team membership → TeamPlanningSlot
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId: targetUserId, activeTo: null },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);

    const planned = teamIds.length > 0
      ? await this.prisma.teamPlanningSlot.findMany({
          where: {
            teamId: { in: teamIds },
            date: { gte: fromDate, lte: toDate },
          },
          include: {
            job: { select: { reference: true, title: true, address: true } },
            team: { select: { name: true } },
          },
          orderBy: [{ date: 'asc' }, { startHour: 'asc' }],
        })
      : [];

    // Actual: TimeEntry
    const whereTime: any = {
      userId: targetUserId,
      date: { gte: fromDate, lte: toDate },
    };
    if (companyId) whereTime.companyId = companyId;

    const actual = await this.prisma.timeEntry.findMany({
      where: whereTime,
      include: {
        job: { select: { reference: true, title: true } },
      },
      orderBy: { date: 'asc' },
    });

    return {
      planned: planned.map((s) => ({
        date: s.date.toISOString().slice(0, 10),
        startHour: s.startHour,
        endHour: s.endHour,
        jobRef: s.job?.reference ?? '',
        jobTitle: s.job?.title ?? '',
        jobAddress: s.job?.address ?? '',
        teamName: s.team?.name ?? '',
      })),
      actual: actual.map((t) => ({
        date: t.date.toISOString().slice(0, 10),
        hours: Number(t.hours),
        description: t.description,
        status: t.status,
        jobRef: (t as any).job?.reference ?? '',
        jobTitle: (t as any).job?.title ?? '',
      })),
    };
  }

  // ─── Certification matrix ─────────────────────────────────────────────────

  async getCertificationMatrix(companyId: string | null) {
    const whereUser: any = { isActive: true };
    if (companyId) whereUser.companyId = companyId;

    const users = await this.prisma.user.findMany({
      where: whereUser,
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });

    // Get all doc types present in the system
    const whereDoc: any = {};
    if (companyId) whereDoc.companyId = companyId;
    const allDocs = await this.prisma.hrDocument.findMany({
      where: whereDoc,
      select: { userId: true, type: true, expiresAt: true },
    });

    // Collect unique types
    const types = [...new Set(allDocs.map(d => d.type))].sort();
    const now = new Date();

    const matrix = users.map(u => {
      const userDocs = allDocs.filter(d => d.userId === u.id);
      const certifications: Record<string, 'ok' | 'expired' | 'missing'> = {};
      for (const type of types) {
        const doc = userDocs.find(d => d.type === type);
        if (!doc) {
          certifications[type] = 'missing';
        } else if (doc.expiresAt && doc.expiresAt < now) {
          certifications[type] = 'expired';
        } else {
          certifications[type] = 'ok';
        }
      }
      return { userId: u.id, userName: u.name, role: u.role, certifications };
    });

    return { types, matrix };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private mapDoc(d: any) {
    return {
      id: d.id,
      userId: d.userId,
      type: d.type,
      label: d.label,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      purpose: d.purpose,
      expiresAt: d.expiresAt?.toISOString() ?? null,
      retentionUntil: d.retentionUntil?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    };
  }
}
