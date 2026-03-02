import { IsString, IsNumber, IsOptional } from 'class-validator';

export class PresignJobPhotoDto {
  @IsString() filename: string;
  @IsString() contentType: string;
}

export class CreateJobPhotoDto {
  @IsString() storageKey: string;
  @IsString() filename: string;
  @IsString() contentType: string;
  @IsNumber() sizeBytes: number;
}
