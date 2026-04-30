import { IsString, IsEmail, IsEnum, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateClientDto {
  @IsString() name: string;
  @IsString() contact: string;
  @IsEmail() email: string;
  @IsString() phone: string;
  @IsString() address: string;
  @IsString() city: string;
  @IsEnum(['public', 'private']) type: 'public' | 'private';

  // Optional legal fields — useful for B2B clients on Factur-X EN16931.
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @Matches(/^\d{9}$/, { message: 'siren must be 9 digits' }) siren?: string;
  @IsOptional() @Matches(/^\d{14}$/, { message: 'siret must be 14 digits' }) siret?: string;
  @IsOptional() @IsString() @MaxLength(10) apeCode?: string;
}

export class UpdateClientDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() contact?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsEnum(['public', 'private']) type?: 'public' | 'private';
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @Matches(/^\d{9}$/, { message: 'siren must be 9 digits' }) siren?: string;
  @IsOptional() @Matches(/^\d{14}$/, { message: 'siret must be 14 digits' }) siret?: string;
  @IsOptional() @IsString() @MaxLength(10) apeCode?: string;
}
