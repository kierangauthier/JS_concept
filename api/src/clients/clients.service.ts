import { Injectable, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/create-client.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string | null, pagination: PaginationDto) {
    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;
    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: { company: { select: { code: true } } },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: data.map((c) => ({
        id: c.id,
        name: c.name,
        contact: c.contact,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        postalCode: c.postalCode,
        siren: c.siren,
        siret: c.siret,
        apeCode: c.apeCode,
        type: c.type,
        company: c.company.code,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async findOne(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;

    const client = await this.prisma.client.findFirst({
      where,
      include: { company: { select: { code: true } } },
    });
    if (!client) throw new NotFoundException('Client not found');

    return {
      id: client.id,
      name: client.name,
      contact: client.contact,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      postalCode: client.postalCode,
      siren: client.siren,
      siret: client.siret,
      apeCode: client.apeCode,
      type: client.type,
      company: client.company.code,
      createdAt: client.createdAt.toISOString(),
    };
  }

  async create(dto: CreateClientDto, companyId: string) {
    const client = await this.prisma.client.create({
      data: {
        id: createId(),
        ...dto,
        type: dto.type as any,
        companyId,
      },
      include: { company: { select: { code: true } } },
    });

    return {
      id: client.id,
      name: client.name,
      contact: client.contact,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      postalCode: client.postalCode,
      siren: client.siren,
      siret: client.siret,
      apeCode: client.apeCode,
      type: client.type,
      company: client.company.code,
      createdAt: client.createdAt.toISOString(),
    };
  }

  async softDelete(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;
    const client = await this.prisma.client.findFirst({ where });
    if (!client) throw new NotFoundException('Client not found');

    await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async update(id: string, dto: UpdateClientDto, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;

    const existing = await this.prisma.client.findFirst({ where });
    if (!existing) throw new NotFoundException('Client not found');

    const client = await this.prisma.client.update({
      where: { id },
      data: { ...dto, type: dto.type as any },
      include: { company: { select: { code: true } } },
    });

    return {
      id: client.id,
      name: client.name,
      contact: client.contact,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      postalCode: client.postalCode,
      siren: client.siren,
      siret: client.siret,
      apeCode: client.apeCode,
      type: client.type,
      company: client.company.code,
      createdAt: client.createdAt.toISOString(),
    };
  }
}
