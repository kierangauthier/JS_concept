import { Controller, Get, Post, Patch, Delete, Param, Body, Req, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { assertStrongPassword, BCRYPT_ROUNDS } from '../common/security/password.policy';
import type { AuthedRequest } from '../common/types/authed-request';
import { createId } from '@paralleldrive/cuid2';
import * as bcrypt from 'bcrypt';

@Controller('api/users')
@Roles('admin', 'conducteur')
export class UsersController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  @Get()
  async findAll(@Req() req: AuthedRequest) {
    const where: any = {};
    if (req.companyId) where.companyId = req.companyId;

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        company: { select: { code: true } },
      },
      orderBy: { name: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      company: u.company.code,
      isActive: u.isActive,
    }));
  }

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateUserDto, @Req() req: AuthedRequest, @CurrentUser('id') userId: string) {
    assertStrongPassword(dto.password);

    // Check for duplicate email
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Un utilisateur avec cet email existe déjà');

    // Resolve companyId: accept either a company code (ASP/JS) or a database ID
    let company = await this.prisma.company.findUnique({ where: { id: dto.companyId } });
    if (!company) {
      // Try resolving as company code
      company = await this.prisma.company.findFirst({ where: { code: dto.companyId as any } });
    }
    if (!company) throw new NotFoundException('Entité introuvable');
    const resolvedCompanyId = company.id;

    // A company-scoped admin cannot create users in another company.
    if (req.companyId && resolvedCompanyId !== req.companyId) {
      throw new ForbiddenException('Création hors de votre périmètre');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        id: createId(),
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role as any,
        companyId: resolvedCompanyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        company: { select: { code: true } },
      },
    });

    this.audit.log({
      action: 'USER_CREATE',
      entity: 'user',
      entityId: user.id,
      after: { name: dto.name, email: dto.email, role: dto.role },
      userId,
      companyId: resolvedCompanyId,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company.code,
      isActive: user.isActive,
    };
  }

  @Patch(':id')
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthedRequest,
    @CurrentUser('id') userId: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Utilisateur introuvable');

    // Cross-tenant guard: an admin scoped to a company cannot touch users of other companies.
    // req.companyId === null only when scope is GROUP (admin on all companies).
    if (req.companyId && existing.companyId !== req.companyId) {
      throw new ForbiddenException('Utilisateur hors de votre périmètre');
    }

    // If email is being changed, check for duplicates
    if (dto.email && dto.email !== existing.email) {
      const dup = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (dup) throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.role !== undefined && { role: dto.role as any }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        company: { select: { code: true } },
      },
    });

    this.audit.log({
      action: 'USER_UPDATE',
      entity: 'user',
      entityId: id,
      before: { name: existing.name, email: existing.email, role: existing.role },
      after: dto,
      userId,
      companyId: existing.companyId,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company.code,
      isActive: user.isActive,
    };
  }

  @Delete(':id')
  @Roles('admin')
  async deactivate(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
    @CurrentUser('id') userId: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Utilisateur introuvable');

    if (req.companyId && existing.companyId !== req.companyId) {
      throw new ForbiddenException('Utilisateur hors de votre périmètre');
    }

    // Prevent self-deactivation
    if (id === userId) throw new ForbiddenException('Impossible de désactiver votre propre compte');

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

    this.audit.log({
      action: 'USER_DEACTIVATE',
      entity: 'user',
      entityId: id,
      before: { isActive: true },
      after: { isActive: false, deletedAt: true },
      userId,
      companyId: existing.companyId,
    });

    return { deactivated: true };
  }

  @Patch(':id/reset-password')
  @Roles('admin')
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  async resetPassword(
    @Param('id') id: string,
    @Body() body: { password: string },
    @Req() req: AuthedRequest,
    @CurrentUser('id') userId: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Utilisateur introuvable');

    if (req.companyId && existing.companyId !== req.companyId) {
      throw new ForbiddenException('Utilisateur hors de votre périmètre');
    }

    assertStrongPassword(body?.password);

    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    this.audit.log({
      action: 'USER_RESET_PASSWORD',
      entity: 'user',
      entityId: id,
      userId,
      companyId: existing.companyId,
    });

    return { reset: true };
  }
}
