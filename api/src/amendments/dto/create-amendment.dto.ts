import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AmendmentLineDto {
  @IsString()
  designation: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;
}

export class CreateAmendmentDto {
  @IsString()
  subject: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmendmentLineDto)
  lines?: AmendmentLineDto[];
}

export class UpdateAmendmentDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmendmentLineDto)
  lines?: AmendmentLineDto[];
}

export class UpdateAmendmentStatusDto {
  @IsString()
  status: 'sent' | 'accepted' | 'refused';
}
