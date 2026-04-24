import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/strong-password.decorator';

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(2) name: string;
  @IsStrongPassword() password: string;
  @IsEnum(['admin', 'conducteur', 'technicien', 'comptable']) role: string;
  @IsString() companyId: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(['admin', 'conducteur', 'technicien', 'comptable']) role?: string;
}
