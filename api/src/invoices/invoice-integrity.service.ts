import { Injectable } from '@nestjs/common';
import {
  IntegrityInvoice,
  canonicalizeInvoice,
  computeInvoiceHmac,
  verifyInvoiceHmac,
} from './invoice-integrity.lib';
import { getInvoiceHmacKey } from '../common/security/env-guards';

/**
 * V2.2 — Cryptographic integrity of emitted invoices.
 *
 * An invoice is "sealed" the moment it transitions out of `draft`. We compute
 * a HMAC-SHA256 over a canonical JSON of the legally significant fields and
 * store it. Any later read re-computes the hash and flags a mismatch.
 *
 * The hashing primitives live in ./invoice-integrity.lib so they can be unit
 * tested without pulling the Nest runtime.
 *
 * Key management:
 *   - `INVOICE_HMAC_KEY` env var (required in production, recommended ≥ 48 bytes
 *     from `openssl rand -base64 48`).
 *   - Rotating the key MUST be accompanied by a re-sealing migration of every
 *     sealed invoice using the previous key — do not rotate casually.
 */
@Injectable()
export class InvoiceIntegrityService {
  canonicalize(invoice: IntegrityInvoice): string {
    return canonicalizeInvoice(invoice);
  }

  compute(invoice: IntegrityInvoice): string {
    return computeInvoiceHmac(invoice, getInvoiceHmacKey());
  }

  verify(invoice: IntegrityInvoice, storedHash: string | null) {
    return verifyInvoiceHmac(invoice, storedHash, getInvoiceHmacKey());
  }
}
