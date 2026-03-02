import { IsString, IsNumber, IsDateString, IsOptional, IsEnum } from 'class-validator';

export class CreateTimeEntryDto {
  @IsString() jobId: string;
  @IsDateString() date: string;
  @IsNumber() hours: number;
  @IsString() description: string;
}

export class UpdateTimeEntryDto {
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsNumber() hours?: number;
  @IsOptional() @IsString() description?: string;
}
