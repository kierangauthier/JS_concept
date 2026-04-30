import { IsString, IsOptional, IsDateString, IsNumber, IsEnum, IsArray } from 'class-validator';

export class CreateJobDto {
  @IsString() title: string;
  @IsString() address: string;
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() quoteId?: string;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) assignedUserIds?: string[];
  @IsOptional() @IsNumber() hourlyRate?: number;
  @IsOptional() @IsNumber() estimatedHours?: number;
  @IsOptional() @IsString() responsableId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateJobDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsEnum(['planned', 'in_progress', 'paused', 'completed', 'invoiced']) status?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsNumber() progress?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) assignedUserIds?: string[];
  @IsOptional() @IsNumber() hourlyRate?: number;
  @IsOptional() @IsNumber() estimatedHours?: number;
  @IsOptional() @IsString() responsableId?: string;
  @IsOptional() @IsString() notes?: string;
}
