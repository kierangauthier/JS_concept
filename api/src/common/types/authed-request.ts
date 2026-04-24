import type { Request } from 'express';

/**
 * V3r — Typed shape of the request object inside authenticated handlers.
 *
 * `user` is populated by `JwtStrategy.validate()` (auth/strategies/jwt.strategy.ts).
 * `companyId` / `companyScope` are set by `CompanyGuard`.
 * `correlationId` is set by `CorrelationIdMiddleware` (V3.7).
 *
 * Import this instead of annotating handlers with `: any`.
 */
export interface AuthedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'conducteur' | 'technicien' | 'comptable' | 'collaborateur';
  avatar: string | null;
  companyId: string;
  companyCode: string;
  companyName: string;
}

export interface AuthedRequest extends Request {
  user?: AuthedUser;
  companyId: string | null;
  companyScope?: 'GROUP' | 'OWN' | 'COMPANY';
  correlationId?: string;
}
