import { IsInt, IsString, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreateReminderRuleDto {
  @IsInt() @Min(1) @Max(5) level: number;
  @IsInt() @Min(1) delayDays: number;
  @IsString() subject: string;
  @IsString() bodyTemplate: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateReminderRuleDto {
  @IsOptional() @IsInt() @Min(1) delayDays?: number;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() bodyTemplate?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
