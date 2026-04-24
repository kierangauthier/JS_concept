import { BadRequestException } from '@nestjs/common';

export const BCRYPT_ROUNDS = 12;

const MIN_LENGTH = 12;

const UPPER = /[A-Z]/;
const LOWER = /[a-z]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[^A-Za-z0-9]/;

export interface PasswordPolicyResult {
  ok: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  if (typeof password !== 'string') {
    return { ok: false, errors: ['Mot de passe invalide'] };
  }
  if (password.length < MIN_LENGTH) {
    errors.push(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères`);
  }
  if (!UPPER.test(password)) errors.push('Une majuscule est requise');
  if (!LOWER.test(password)) errors.push('Une minuscule est requise');
  if (!DIGIT.test(password)) errors.push('Un chiffre est requis');
  if (!SYMBOL.test(password)) errors.push('Un caractère spécial est requis');
  return { ok: errors.length === 0, errors };
}

export function assertStrongPassword(password: string): void {
  const { ok, errors } = validatePassword(password);
  if (!ok) {
    throw new BadRequestException({
      message: 'Mot de passe non conforme',
      errors,
    });
  }
}
