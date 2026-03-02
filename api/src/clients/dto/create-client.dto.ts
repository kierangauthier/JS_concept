import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsString()
  contact: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsEnum(['public', 'private'])
  type: 'public' | 'private';
}

export class UpdateClientDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() contact?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsEnum(['public', 'private']) type?: 'public' | 'private';
}
