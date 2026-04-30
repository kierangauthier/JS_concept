import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteLineDto {
  @IsString() designation: string;
  @IsString() unit: string;
  @IsNumber() quantity: number;
  @IsNumber() unitPrice: number;
  @IsOptional() @IsNumber() costPrice?: number;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class CreateQuoteDto {
  @IsString() clientId: string;
  @IsString() subject: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsNumber() vatRate?: number;
  @IsDateString() validUntil: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  lines?: QuoteLineDto[];
}

export class UpdateQuoteDto {
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsNumber() vatRate?: number;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional()
  @IsEnum(['draft', 'sent', 'accepted', 'refused', 'expired'])
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  lines?: QuoteLineDto[];
}
