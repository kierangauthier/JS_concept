import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class PresignUploadDto {
  @IsString() userId: string;
  @IsString() type: string;
  @IsString() filename: string;
  @IsString() contentType: string;
}

export class CreateDocumentDto {
  @IsString() userId: string;
  @IsString() type: string;
  @IsString() label: string;
  @IsString() storageKey: string;
  @IsString() mimeType: string;
  @IsNumber() sizeBytes: number;
  @IsString() purpose: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsDateString() retentionUntil?: string;
}
