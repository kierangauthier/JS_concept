import { IsString, IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlanningSlotDto {
  @IsString() userId: string;
  @IsString() jobId: string;
  @IsDateString() date: string;
  @IsOptional() @IsString() note?: string;
}

class SlotItem {
  @IsString() userId: string;
  @IsString() jobId: string;
  @IsDateString() date: string;
  @IsOptional() @IsString() note?: string;
}

export class BulkCreatePlanningSlotDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotItem)
  slots: SlotItem[];
}
