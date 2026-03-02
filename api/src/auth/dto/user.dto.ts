import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(2) name: string;
  @IsString() @MinLength(6) password: string;
  @IsEnum(['admin', 'conducteur', 'technicien', 'comptable']) role: string;
  @IsString() companyId: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(['admin', 'conducteur', 'technicien', 'comptable']) role?: string;
}
