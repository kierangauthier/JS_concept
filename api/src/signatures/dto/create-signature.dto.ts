import { IsString, IsDateString } from 'class-validator';

export class CreateSignatureDto {
  @IsString()
  jobId: string;

  @IsDateString()
  interventionDate: string;

  @IsString()
  signatoryName: string;
}
