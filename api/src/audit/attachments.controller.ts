import { Controller, Get, Query, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/attachments')
@Roles('admin', 'conducteur')
export class AttachmentsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findByEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Req() req: any,
  ) {
    if (!entityType || !entityId) return [];

    // Build where clause based on entity type (polymorphic FK)
    const where: any = {};
    switch (entityType) {
      case 'quote':
        where.quoteId = entityId;
        break;
      case 'job':
        where.jobId = entityId;
        break;
      case 'purchase':
        where.purchaseId = entityId;
        break;
      case 'invoice':
        where.invoiceId = entityId;
        break;
      default:
        return [];
    }

    const attachments = await this.prisma.attachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return attachments.map((a) => ({
      id: a.id,
      name: a.name,
      type: this.inferFileType(a.mimeType),
      size: this.formatSize(a.sizeBytes),
      uploadedBy: a.uploadedBy,
      uploadedAt: a.createdAt.toISOString(),
    }));
  }

  private inferFileType(mimeType: string): 'pdf' | 'image' | 'doc' {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    return 'doc';
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }
}
