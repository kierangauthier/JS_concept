import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class CreateProductDto {
  @IsString() reference: string;
  @IsString() designation: string;
  @IsString() unit: string;
  @IsNumber() salePrice: number;
  @IsOptional() @IsNumber() costPrice?: number;
  @IsOptional() @IsString() categoryId?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() salePrice?: number;
  @IsOptional() @IsNumber() costPrice?: number;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
