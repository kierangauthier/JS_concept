import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto, AddMemberDto } from './dto/team.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/teams')
@Roles('admin', 'conducteur', 'technicien')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.teamsService.findAll(req.companyId);
  }

  @Post()
  @Roles('admin', 'conducteur')
  create(@Body() dto: CreateTeamDto, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.teamsService.create(dto, req.companyId, userId);
  }

  @Patch(':id')
  @Roles('admin', 'conducteur')
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.teamsService.update(id, dto, req.companyId, userId);
  }

  @Post(':id/members')
  @Roles('admin', 'conducteur')
  addMember(@Param('id') teamId: string, @Body() dto: AddMemberDto, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.teamsService.addMember(teamId, dto, req.companyId, userId);
  }

  @Delete(':id/members/:userId')
  @Roles('admin', 'conducteur')
  removeMember(@Param('id') teamId: string, @Param('userId') memberUserId: string, @Req() req: any, @CurrentUser('id') userId: string) {
    return this.teamsService.removeMember(teamId, memberUserId, req.companyId, userId);
  }
}
