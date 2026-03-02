import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateAbsenceDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  typeId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateAbsenceTypeDto {
  @IsString()
  label: string;
}
