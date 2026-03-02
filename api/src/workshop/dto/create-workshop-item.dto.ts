import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class CreateWorkshopItemDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsString() jobId: string;
  @IsOptional() @IsEnum(['low', 'medium', 'high']) priority?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() assignedTo?: string;
}

export class UpdateWorkshopItemDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(['low', 'medium', 'high']) priority?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() assignedTo?: string;
}
