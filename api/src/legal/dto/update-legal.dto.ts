import { IsString, IsOptional, IsNumber, Matches, IsIn, IsEmail, IsUrl, MaxLength, Min } from 'class-validator';

export const FACTURX_PROFILES = ['MINIMUM', 'BASIC', 'EN16931', 'EXTENDED'] as const;
export type FacturxProfile = typeof FACTURX_PROFILES[number];

/**
 * Editable subset of the Company row holding the legal/admin info.
 * Every field is optional so a PATCH request can update one or many at once.
 */
export class UpdateLegalDto {
  // Identity
  @IsOptional() @IsString() @MaxLength(120) legalName?: string;
  @IsOptional() @IsString() @MaxLength(160) tagline?: string;
  @IsOptional() @IsString() @MaxLength(40) legalForm?: string;
  @IsOptional() @IsNumber() @Min(0) shareCapital?: number;
  @IsOptional() @IsString() @MaxLength(120) legalRepresentative?: string;

  // Official numbers
  @IsOptional() @Matches(/^\d{9}$/, { message: 'siren must be 9 digits' }) siren?: string;
  @IsOptional() @Matches(/^\d{14}$/, { message: 'siret must be 14 digits' }) siret?: string;
  @IsOptional() @IsString() @MaxLength(10) apeCode?: string;
  @IsOptional()
  @Matches(/^[A-Z]{2}[A-Z0-9]{2,13}$/, { message: 'vatNumber must look like FR12345678901' })
  vatNumber?: string;
  @IsOptional() @IsString() @MaxLength(80) rcsCity?: string;

  // Address & contact
  @IsOptional() @IsString() @MaxLength(160) addressLine1?: string;
  @IsOptional() @IsString() @MaxLength(160) addressLine2?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(2) countryCode?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsUrl({ require_protocol: false }) website?: string;

  // Banking
  @IsOptional()
  @Matches(/^[A-Z]{2}\d{2}[A-Z0-9 ]{11,30}$/i, { message: 'iban looks invalid' })
  iban?: string;
  @IsOptional() @Matches(/^[A-Z0-9]{8}([A-Z0-9]{3})?$/i, { message: 'bic must be 8 or 11 chars' }) bic?: string;
  @IsOptional() @IsString() @MaxLength(80) bankName?: string;

  // Commercial terms
  @IsOptional() @IsString() @MaxLength(200) paymentTerms?: string;
  @IsOptional() @IsString() @MaxLength(200) latePaymentRate?: string;
  @IsOptional() @IsNumber() @Min(0) lateFeeFlat?: number;
  @IsOptional() @IsNumber() @Min(0) discountRate?: number;

  // Factur-X
  @IsOptional() @IsIn(FACTURX_PROFILES) facturxProfile?: FacturxProfile;
}
