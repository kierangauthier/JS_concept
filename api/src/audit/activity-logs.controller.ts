import { Controller, Get, Query, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/activity-logs')
@Roles('admin', 'conducteur')
export class ActivityLogsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findByEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Req() req: any,
  ) {
    if (!entityType || !entityId) return [];

    const where: any = { entityType, entityId };
    if (req.companyId) where.companyId = req.companyId;

    const logs = await this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return logs.map((l: any) => ({
      id: l.id,
      user: l.user ? l.user.name : 'Système',
      action: l.action,
      detail: l.detail,
      timestamp: l.createdAt.toISOString(),
    }));
  }
}
