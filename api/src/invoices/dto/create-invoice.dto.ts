import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';

export class CreateInvoiceDto {
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() jobId?: string;
  @IsNumber() amount: number;
  @IsDateString() issuedAt: string;
  @IsDateString() dueDate: string;
}

export class UpdateInvoiceDto {
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsEnum(['draft', 'sent', 'paid', 'overdue', 'cancelled']) status?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}

export class CreateSituationDto {
  @IsNumber() percentage: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() date?: string;
}
