import { IsString, IsOptional } from 'class-validator';

export class CreateFromQuoteDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsString() quoteId: string;
}

export class CreateQuoteFromTemplateDto {
  @IsString() clientId: string;
  @IsString() subject: string;
  @IsString() validUntil: string;
}
