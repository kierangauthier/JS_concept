import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../hr/minio.service';
import { CreateSignatureDto } from './dto/create-signature.dto';

@Injectable()
export class SignaturesService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  async create(dto: CreateSignatureDto, companyId: string) {
    if (!companyId) throw new ForbiddenException('Cannot sign under GROUP scope');

    const job = await this.prisma.job.findFirst({
      where: { id: dto.jobId, companyId },
    });
    if (!job) throw new NotFoundException('Job not found');

    const storageKey = `signatures/${dto.jobId}/${Date.now()}.png`;

    // Get presigned upload URL for the frontend to upload
    const uploadUrl = await this.minio.getPresignedPutUrl(storageKey, 'image/png');

    const signature = await this.prisma.signature.create({
      data: {
        jobId: dto.jobId,
        interventionDate: new Date(dto.interventionDate),
        signatoryName: dto.signatoryName,
        storageKey,
        companyId,
      },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        entityId: dto.jobId,
        entityType: 'job',
        action: 'SIGNATURE_ADDED',
        detail: `Signature client : ${dto.signatoryName}`,
        companyId,
      },
    });

    return {
      id: signature.id,
      uploadUrl,
      storageKey,
      signatoryName: signature.signatoryName,
      interventionDate: signature.interventionDate.toISOString(),
      createdAt: signature.createdAt.toISOString(),
    };
  }

  async getByJob(jobId: string, companyId: string | null) {
    const where: any = { jobId };
    if (companyId) where.companyId = companyId;

    const signatures = await this.prisma.signature.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const results = await Promise.all(
      signatures.map(async (sig) => {
        let downloadUrl: string | null = null;
        try {
          downloadUrl = await this.minio.getPresignedGetUrl(sig.storageKey);
        } catch {}
        return {
          id: sig.id,
          signatoryName: sig.signatoryName,
          interventionDate: sig.interventionDate.toISOString(),
          downloadUrl,
          createdAt: sig.createdAt.toISOString(),
        };
      }),
    );

    return results;
  }
}
