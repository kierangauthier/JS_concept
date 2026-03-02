import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAbsenceDto, CreateAbsenceTypeDto } from './dto/create-absence.dto';

@Injectable()
export class AbsencesService {
  constructor(private prisma: PrismaService) {}

  private mapAbsence(a: any) {
    return {
      id: a.id,
      startDate: a.startDate.toISOString().slice(0, 10),
      endDate: a.endDate.toISOString().slice(0, 10),
      status: a.status,
      reason: a.reason,
      typeId: a.typeId,
      typeLabel: a.type?.label ?? '',
      userId: a.userId,
      userName: a.user?.name ?? '',
      company: a.company?.code ?? '',
      createdAt: a.createdAt.toISOString(),
    };
  }

  private includes = {
    type: { select: { label: true } },
    user: { select: { name: true } },
    company: { select: { code: true } },
  };

  async findAll(companyId: string | null, status?: string) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;
    const data = await this.prisma.absence.findMany({
      where,
      include: this.includes,
      orderBy: { startDate: 'desc' },
    });
    return data.map(this.mapAbsence);
  }

  async create(dto: CreateAbsenceDto, userId: string, companyId: string) {
    if (!companyId) throw new ForbiddenException('Cannot create under GROUP scope');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException('End date must be after start date');

    const absence = await this.prisma.absence.create({
      data: {
        startDate: start,
        endDate: end,
        typeId: dto.typeId,
        reason: dto.reason,
        userId,
        companyId,
      },
      include: this.includes,
    });

    return this.mapAbsence(absence);
  }

  async approve(id: string, approverUserId: string, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const absence = await this.prisma.absence.findFirst({ where });
    if (!absence) throw new NotFoundException('Absence not found');
    if (absence.status !== 'pending') throw new BadRequestException('Can only approve pending absences');

    const updated = await this.prisma.absence.update({
      where: { id },
      data: { status: 'approved', approvedByUserId: approverUserId },
      include: this.includes,
    });
    return this.mapAbsence(updated);
  }

  async reject(id: string, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const absence = await this.prisma.absence.findFirst({ where });
    if (!absence) throw new NotFoundException('Absence not found');
    if (absence.status !== 'pending') throw new BadRequestException('Can only reject pending absences');

    const updated = await this.prisma.absence.update({
      where: { id },
      data: { status: 'rejected' },
      include: this.includes,
    });
    return this.mapAbsence(updated);
  }

  async remove(id: string, userId: string, role: string) {
    const absence = await this.prisma.absence.findUnique({ where: { id } });
    if (!absence) throw new NotFoundException('Absence not found');
    if (role === 'technicien' && absence.userId !== userId) {
      throw new ForbiddenException('Cannot delete another user\'s absence');
    }
    if (absence.status !== 'pending') throw new BadRequestException('Can only delete pending absences');

    await this.prisma.absence.delete({ where: { id } });
    return { deleted: true };
  }

  // Absence types
  async getTypes(companyId: string | null) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    return this.prisma.absenceType.findMany({ where, orderBy: { label: 'asc' } });
  }

  async createType(dto: CreateAbsenceTypeDto, companyId: string) {
    return this.prisma.absenceType.create({
      data: { label: dto.label, companyId },
    });
  }
}
