import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * V3.7 — Correlation-ID middleware.
 *
 * Accepts an incoming `X-Request-Id` header (from an API gateway / load
 * balancer) or mints a fresh UUID when missing. The id is:
 *   - echoed back in the response header so callers can tie their logs to ours;
 *   - attached to `req.correlationId` for downstream consumers (logger, audit).
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request & { correlationId?: string }, res: Response, next: NextFunction) {
    const incoming = (req.headers['x-request-id'] as string | undefined)?.trim();
    const id = incoming && incoming.length > 0 && incoming.length <= 128
      ? incoming
      : randomUUID();
    req.correlationId = id;
    res.setHeader('X-Request-Id', id);
    next();
  }
}
