import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../decorators/public.decorator';

/**
 * Exposes the current CSRF token so the SPA can bootstrap the double-submit flow
 * before any mutation. The token value is identical to the `XSRF-TOKEN` cookie
 * set by the CSRF middleware on the same response.
 *
 * This endpoint is intentionally public: knowing the token is useless to an
 * attacker because they cannot read the victim's cookie value from a cross-site
 * context (same-origin policy).
 */
@Controller('api')
export class CsrfController {
  @Public()
  @Get('csrf-token')
  getToken(@Req() req: Request) {
    const token = (req as Request & { csrfToken?: string }).csrfToken ?? null;
    return { csrfToken: token };
  }
}
