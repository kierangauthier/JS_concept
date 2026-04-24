import { IsEmail, IsString, Length } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/strong-password.decorator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  /** Raw UUID emailed to the user. Length pinned to a sensible window. */
  @IsString()
  @Length(16, 128)
  token: string;

  /** I5 policy applies: 8+ chars, mixed-case, digit, special. */
  @IsStrongPassword()
  password: string;
}
