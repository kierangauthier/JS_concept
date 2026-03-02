import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, CreateProductDto, UpdateProductDto } from './dto/create-catalog.dto';
import { createId } from '@paralleldrive/cuid2';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  // ─── Categories ────────────────────────────────────────

  async findAllCategories(companyId: string | null) {
    const where: any = {};
    if (companyId) where.companyId = companyId;

    const categories = await this.prisma.catalogCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      productCount: c._count.products,
    }));
  }

  async createCategory(dto: CreateCategoryDto, companyId: string) {
    const category = await this.prisma.catalogCategory.create({
      data: {
        id: createId(),
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
        companyId,
      },
    });

    return { id: category.id, name: category.name, sortOrder: category.sortOrder, productCount: 0 };
  }

  // ─── Products ──────────────────────────────────────────

  private mapProduct(p: any) {
    return {
      id: p.id,
      reference: p.reference,
      designation: p.designation,
      unit: p.unit,
      salePrice: Number(p.salePrice),
      costPrice: Number(p.costPrice),
      isActive: p.isActive,
      categoryId: p.categoryId,
      categoryName: p.category?.name ?? null,
      company: p.company?.code ?? '',
    };
  }

  async findAllProducts(companyId: string | null, search?: string, categoryId?: string) {
    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.catalogProduct.findMany({
      where,
      orderBy: [{ category: { sortOrder: 'asc' } }, { reference: 'asc' }],
      include: {
        category: { select: { name: true } },
        company: { select: { code: true } },
      },
      take: 200,
    });

    return products.map(this.mapProduct);
  }

  async findOneProduct(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;

    const product = await this.prisma.catalogProduct.findFirst({
      where,
      include: {
        category: { select: { name: true } },
        company: { select: { code: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.mapProduct(product);
  }

  async createProduct(dto: CreateProductDto, companyId: string) {
    // Check unique reference within company
    const existing = await this.prisma.catalogProduct.findUnique({
      where: { companyId_reference: { companyId, reference: dto.reference } },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException(`La référence "${dto.reference}" existe déjà`);
    }

    const product = await this.prisma.catalogProduct.create({
      data: {
        id: createId(),
        reference: dto.reference,
        designation: dto.designation,
        unit: dto.unit,
        salePrice: dto.salePrice,
        costPrice: dto.costPrice ?? 0,
        categoryId: dto.categoryId || null,
        companyId,
      },
      include: {
        category: { select: { name: true } },
        company: { select: { code: true } },
      },
    });

    return this.mapProduct(product);
  }

  async updateProduct(id: string, dto: UpdateProductDto, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;

    const existing = await this.prisma.catalogProduct.findFirst({ where });
    if (!existing) throw new NotFoundException('Product not found');

    // If reference changed, check uniqueness
    if (dto.reference && dto.reference !== existing.reference) {
      const dup = await this.prisma.catalogProduct.findUnique({
        where: { companyId_reference: { companyId: existing.companyId, reference: dto.reference } },
      });
      if (dup && dup.id !== id && !dup.deletedAt) {
        throw new ConflictException(`La référence "${dto.reference}" existe déjà`);
      }
    }

    const product = await this.prisma.catalogProduct.update({
      where: { id },
      data: {
        ...(dto.reference !== undefined && { reference: dto.reference }),
        ...(dto.designation !== undefined && { designation: dto.designation }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.salePrice !== undefined && { salePrice: dto.salePrice }),
        ...(dto.costPrice !== undefined && { costPrice: dto.costPrice }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        category: { select: { name: true } },
        company: { select: { code: true } },
      },
    });

    return this.mapProduct(product);
  }

  async softDeleteProduct(id: string, companyId: string | null) {
    const where: any = { id, deletedAt: null };
    if (companyId) where.companyId = companyId;

    const product = await this.prisma.catalogProduct.findFirst({ where });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.catalogProduct.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }

  // ─── CSV Import ────────────────────────────────────────

  async importCsv(csvContent: string, companyId: string) {
    const lines = csvContent.split('\n').filter((l) => l.trim());
    if (lines.length < 2) throw new ConflictException('Le fichier CSV est vide');

    // Skip header
    const dataLines = lines.slice(1);
    let imported = 0;
    let skipped = 0;

    for (const line of dataLines) {
      const cols = line.split(';').map((c) => c.trim());
      if (cols.length < 4) {
        skipped++;
        continue;
      }

      const [reference, designation, unit, salePriceStr, costPriceStr, categoryName] = cols;
      const salePrice = parseFloat(salePriceStr.replace(',', '.'));
      const costPrice = costPriceStr ? parseFloat(costPriceStr.replace(',', '.')) : 0;

      if (!reference || !designation || !unit || isNaN(salePrice)) {
        skipped++;
        continue;
      }

      // Find or create category
      let categoryId: string | null = null;
      if (categoryName) {
        let cat = await this.prisma.catalogCategory.findFirst({
          where: { companyId, name: { equals: categoryName, mode: 'insensitive' } },
        });
        if (!cat) {
          cat = await this.prisma.catalogCategory.create({
            data: { id: createId(), name: categoryName, companyId },
          });
        }
        categoryId = cat.id;
      }

      // Upsert product
      const existing = await this.prisma.catalogProduct.findUnique({
        where: { companyId_reference: { companyId, reference } },
      });

      if (existing) {
        await this.prisma.catalogProduct.update({
          where: { id: existing.id },
          data: { designation, unit, salePrice, costPrice, categoryId, deletedAt: null },
        });
      } else {
        await this.prisma.catalogProduct.create({
          data: {
            id: createId(),
            reference,
            designation,
            unit,
            salePrice,
            costPrice,
            categoryId,
            companyId,
          },
        });
      }
      imported++;
    }

    return { imported, skipped, total: dataLines.length };
  }
}
