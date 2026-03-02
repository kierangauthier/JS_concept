import { IsString, IsDateString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateTeamSlotDto {
  @IsString() teamId: string;
  @IsDateString() date: string;
  @IsInt() @Min(7) @Max(17) startHour: number;
  @IsInt() @Min(8) @Max(18) endHour: number;
  @IsString() jobId: string;
  @IsOptional() @IsString() notes?: string;
}

export class WeekActionDto {
  @IsDateString() weekStart: string;
}
