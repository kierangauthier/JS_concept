import { Injectable, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/create-supplier.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  private mapSupplier(s: any) {
    return {
      id: s.id,
      name: s.name,
      contact: s.contact,
      email: s.email,
      phone: s.phone,
      category: s.category,
      company: s.company?.code ?? '',
    };
  }

  async findAll(companyId: string | null, pagination: PaginationDto) {
    const where = companyId ? { companyId } : {};
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: { company: { select: { code: true } } },
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return {
      data: data.map(this.mapSupplier),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async findOne(id: string, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const supplier = await this.prisma.supplier.findFirst({
      where,
      include: { company: { select: { code: true } } },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return this.mapSupplier(supplier);
  }

  async create(dto: CreateSupplierDto, companyId: string) {
    const supplier = await this.prisma.supplier.create({
      data: { id: createId(), ...dto, companyId },
      include: { company: { select: { code: true } } },
    });
    return this.mapSupplier(supplier);
  }

  async update(id: string, dto: UpdateSupplierDto, companyId: string | null) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const existing = await this.prisma.supplier.findFirst({ where });
    if (!existing) throw new NotFoundException('Supplier not found');
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: dto,
      include: { company: { select: { code: true } } },
    });
    return this.mapSupplier(supplier);
  }
}
