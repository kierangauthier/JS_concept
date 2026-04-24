/**
 * CSRF protection — double-submit cookie pattern (OWASP).
 *
 * I1 security fix: protects cookie-based sessions from cross-site request forgery.
 *
 * Flow:
 *   1. Server issues a random token in a NON-httpOnly `XSRF-TOKEN` cookie (readable by JS).
 *   2. Client reads the cookie and echoes its value in the `X-XSRF-TOKEN` header on mutations.
 *   3. Server compares cookie ↔ header (constant-time). Mismatch → 403.
 *
 * A malicious site cannot read the cookie (same-origin policy), so it cannot forge the header.
 *
 * Design choices:
 *   - Skip verification on safe methods (GET/HEAD/OPTIONS).
 *   - Skip when `Authorization: Bearer <token>` is present — Bearer clients are not
 *     susceptible to browser-mediated CSRF (they don't auto-send cookies).
 *     This preserves compatibility with server-to-server, mobile, and E2E test clients.
 *   - Skip pre-auth endpoints (login, refresh) — there is no authenticated session yet,
 *     SameSite=Strict + rate limiting provide baseline protection.
 *   - Rolling issuance: if no cookie is present, generate and set one on the current response.
 */

import type { Request, Response, NextFunction } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-xsrf-token';
const TOKEN_BYTES = 32; // 256 bits
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Paths for which CSRF verification is skipped. */
const CSRF_EXEMPT_PATHS: readonly string[] = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/csrf-token', // GET — never mutates, but explicit
  // Client-side ErrorBoundary fire-and-forget log. No sensitive side effects.
  '/api/logs/client-error',
];

function generateCsrfToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

/** Constant-time string comparison. Returns false on length mismatch or any error. */
function safeEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

function isExemptPath(path: string): boolean {
  return CSRF_EXEMPT_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

function hasBearerAuth(req: Request): boolean {
  const auth = req.headers.authorization;
  return typeof auth === 'string' && auth.startsWith('Bearer ');
}

/**
 * Express middleware implementing double-submit cookie CSRF protection.
 *
 * Must be registered AFTER cookie-parser in main.ts.
 */
export function csrfMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // Ensure a CSRF token cookie exists; rotate on demand if missing.
  let cookieToken: string | undefined = req.cookies?.[CSRF_COOKIE_NAME];
  if (!cookieToken) {
    cookieToken = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, cookieToken, {
      httpOnly: false, // intentionally readable by the SPA
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });
  }
  // Expose the current token for downstream handlers (e.g. GET /api/csrf-token).
  (req as Request & { csrfToken?: string }).csrfToken = cookieToken;

  // Safe methods: no verification required.
  const method = (req.method ?? 'GET').toUpperCase();
  if (!MUTATING_METHODS.has(method)) {
    next();
    return;
  }

  // Pre-auth endpoints and Bearer-token requests bypass CSRF by design.
  if (isExemptPath(req.path) || hasBearerAuth(req)) {
    next();
    return;
  }

  // Double-submit verification.
  const rawHeader = req.headers[CSRF_HEADER_NAME];
  const headerToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (!headerToken || !safeEqual(headerToken, cookieToken)) {
    res.status(403).json({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Invalid or missing CSRF token',
    });
    return;
  }

  next();
}
