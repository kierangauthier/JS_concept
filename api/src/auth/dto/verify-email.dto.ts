import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @Length(16, 128)
  token: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email: string;
}
