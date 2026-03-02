import { IsString, IsOptional, IsIn } from 'class-validator';

export class SendEmailDto {
  @IsIn(['quote', 'invoice'])
  entityType: 'quote' | 'invoice';

  @IsString()
  entityId: string;

  @IsString()
  to: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
