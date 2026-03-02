import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreatePurchaseDto {
  @IsString() supplierId: string;
  @IsOptional() @IsString() jobId?: string;
  @IsNumber() amount: number;
  @IsDateString() orderedAt: string;
}

export class UpdatePurchaseDto {
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsDateString() orderedAt?: string;
}
