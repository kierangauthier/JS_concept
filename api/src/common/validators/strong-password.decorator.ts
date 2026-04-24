import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MinLength } from 'class-validator';

/**
 * Password policy — single source of truth (kept in sync with
 * common/security/password.policy.ts used at runtime).
 *
 * Requirements:
 *  - minimum 12 characters
 *  - at least 1 lowercase letter
 *  - at least 1 uppercase letter
 *  - at least 1 digit
 *  - at least 1 special character
 */
export const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export const PASSWORD_POLICY_MESSAGE =
  'Le mot de passe doit contenir au moins 12 caractères, une minuscule, une majuscule, un chiffre et un caractère spécial';

export const IsStrongPassword = () =>
  applyDecorators(
    IsString(),
    MinLength(12, { message: PASSWORD_POLICY_MESSAGE }),
    Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE }),
  );
