import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTeamDto, UpdateTeamDto, AddMemberDto } from './dto/team.dto';

@Injectable()
export class TeamsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private memberIncludes = {
    where: { activeTo: null },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { activeFrom: 'asc' as const },
  };

  private mapTeam(t: any) {
    return {
      id: t.id,
      name: t.name,
      isActive: t.isActive,
      companyId: t.companyId,
      company: t.company?.code ?? '',
      members: (t.members ?? []).map((m: any) => ({
        id: m.id,
        userId: m.userId,
        userName: m.user?.name ?? '',
        userEmail: m.user?.email ?? '',
        roleInTeam: m.roleInTeam,
      })),
    };
  }

  async findAll(companyId: string | null) {
    const where: any = {};
    if (companyId) where.companyId = companyId;

    const teams = await this.prisma.team.findMany({
      where,
      include: {
        company: { select: { code: true } },
        members: this.memberIncludes,
      },
      orderBy: { name: 'asc' },
    });

    return teams.map((t) => this.mapTeam(t));
  }

  async create(dto: CreateTeamDto, companyId: string, userId: string) {
    if (!companyId) throw new ForbiddenException('Cannot create under GROUP scope');

    const team = await this.prisma.team.create({
      data: { name: dto.name, companyId },
      include: {
        company: { select: { code: true } },
        members: this.memberIncludes,
      },
    });

    this.audit.log({
      action: 'CREATE',
      entity: 'team',
      entityId: team.id,
      after: { name: dto.name },
      userId,
      companyId,
    });

    return this.mapTeam(team);
  }

  async update(id: string, dto: UpdateTeamDto, companyId: string | null, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, ...(companyId ? { companyId } : {}) },
    });
    if (!team) throw new NotFoundException('Team not found');

    const updated = await this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        company: { select: { code: true } },
        members: this.memberIncludes,
      },
    });

    this.audit.log({
      action: 'UPDATE',
      entity: 'team',
      entityId: id,
      before: { name: team.name, isActive: team.isActive },
      after: { name: updated.name, isActive: updated.isActive },
      userId,
      companyId: team.companyId,
    });

    return this.mapTeam(updated);
  }

  async addMember(teamId: string, dto: AddMemberDto, companyId: string | null, userId: string) {
    if (!companyId) throw new ForbiddenException('Cannot modify under GROUP scope');

    // Validate team exists in this company
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, companyId },
    });
    if (!team) throw new NotFoundException('Team not found');

    // Validate user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, companyId: true, name: true, isActive: true },
    });
    if (!targetUser) throw new NotFoundException('User not found');

    // Validate user belongs to the same company as the team
    if (targetUser.companyId !== team.companyId) {
      throw new BadRequestException(
        `User "${targetUser.name}" does not belong to the same company as this team`,
      );
    }

    // Validate user is active
    if (!targetUser.isActive) {
      throw new BadRequestException(`User "${targetUser.name}" is deactivated`);
    }

    // Check no active membership in the SAME team
    const existingInTeam = await this.prisma.teamMember.findFirst({
      where: { teamId, userId: dto.userId, activeTo: null },
    });
    if (existingInTeam) throw new ConflictException('User is already an active member of this team');

    // V1: 1 active team max per technician (per company)
    const existingInOtherTeam = await this.prisma.teamMember.findFirst({
      where: {
        userId: dto.userId,
        activeTo: null,
        team: { companyId },
        teamId: { not: teamId },
      },
    });
    if (existingInOtherTeam) {
      throw new ConflictException(
        'User already has an active membership in another team. Remove them from the other team first.',
      );
    }

    await this.prisma.teamMember.create({
      data: {
        teamId,
        userId: dto.userId,
        roleInTeam: dto.roleInTeam,
      },
    });

    this.audit.log({
      action: 'ADD_MEMBER',
      entity: 'team',
      entityId: teamId,
      after: { userId: dto.userId, roleInTeam: dto.roleInTeam },
      userId,
      companyId,
    });

    // Return refreshed team
    const refreshed = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        company: { select: { code: true } },
        members: this.memberIncludes,
      },
    });
    return this.mapTeam(refreshed);
  }

  async removeMember(teamId: string, memberUserId: string, companyId: string | null, userId: string) {
    if (!companyId) throw new ForbiddenException('Cannot modify under GROUP scope');

    const team = await this.prisma.team.findFirst({
      where: { id: teamId, companyId },
    });
    if (!team) throw new NotFoundException('Team not found');

    const member = await this.prisma.teamMember.findFirst({
      where: { teamId, userId: memberUserId, activeTo: null },
    });
    if (!member) throw new NotFoundException('Active member not found');

    await this.prisma.teamMember.update({
      where: { id: member.id },
      data: { activeTo: new Date() },
    });

    this.audit.log({
      action: 'REMOVE_MEMBER',
      entity: 'team',
      entityId: teamId,
      after: { userId: memberUserId },
      userId,
      companyId,
    });

    const refreshed = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        company: { select: { code: true } },
        members: this.memberIncludes,
      },
    });
    return this.mapTeam(refreshed);
  }
}
