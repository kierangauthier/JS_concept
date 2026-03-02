import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateTeamDto {
  @IsString() name: string;
}

export class UpdateTeamDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AddMemberDto {
  @IsString() userId: string;
  @IsOptional() @IsString() roleInTeam?: string;
}
