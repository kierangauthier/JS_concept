/**
 * PII masking helpers (I2 security fix — RGPD).
 *
 * Audit logs are retained long-term for compliance; they must not contain
 * plain-text personal data. These utilities sanitize payloads before they
 * reach the `AuditLog` table (and any downstream log pipeline).
 *
 * Masking strategy:
 *  - email:      keep first character + domain           →  j***@acme.fr
 *  - phone:      keep country prefix + last 2 digits    →  +33 6 ** ** ** 42
 *  - credentials: fully redacted (replaced with [REDACTED])
 *
 * Fields matched by regex on the property key (case-insensitive) so the helper
 * works on snake_case, camelCase and foreign-keyed columns alike.
 */

const EMAIL_KEYS = /^(email|mail|e_?mail)$/i;
const PHONE_KEYS = /^(phone|tel|telephone|mobile|portable)$/i;
const CREDENTIAL_KEYS =
  /^(password|password_?hash|hashed_?password|token|refresh_?token|access_?token|api_?key|secret|private_?key|client_?secret|authorization)$/i;

/** Maximum recursion depth to protect against cyclic structures. */
const MAX_DEPTH = 6;

/**
 * Mask an email address while keeping enough information to correlate
 * audit entries from the same user.
 *
 * Examples:
 *   "alice@acme.fr"      → "a***@acme.fr"
 *   "a@b.fr"             → "*@b.fr"   (local part ≤ 1 char)
 *   "not-an-email"       → "[REDACTED]"
 */
export function maskEmail(value: unknown): string {
  if (typeof value !== 'string' || !value.includes('@')) {
    return '[REDACTED]';
  }
  const atIndex = value.lastIndexOf('@');
  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);
  if (!local || !domain) return '[REDACTED]';
  const head = local.length > 1 ? local[0] : '*';
  return `${head}***@${domain}`;
}

/**
 * Mask a phone number while keeping the country prefix (if any) and the
 * last two digits for disambiguation.
 *
 * Examples:
 *   "+33 6 12 34 56 78"  → "+33 ****78"
 *   "0612345678"         → "****78"
 *   "123"                → "[REDACTED]"
 */
export function maskPhone(value: unknown): string {
  if (typeof value !== 'string') return '[REDACTED]';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return '[REDACTED]';
  const last2 = digits.slice(-2);
  const match = value.match(/^\s*\+(\d{1,3})/);
  const prefix = match ? `+${match[1]} ` : '';
  return `${prefix}****${last2}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Recursively walk a value and mask PII in-place on a cloned copy.
 * Safe against cycles (depth-capped), preserves arrays and primitives.
 */
export function maskPII<T>(value: T, depth = 0): T {
  if (depth > MAX_DEPTH) return value;
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map((v) => maskPII(v, depth + 1)) as unknown as T;
  }

  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (CREDENTIAL_KEYS.test(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    if (EMAIL_KEYS.test(key)) {
      out[key] = maskEmail(raw);
      continue;
    }
    if (PHONE_KEYS.test(key)) {
      out[key] = maskPhone(raw);
      continue;
    }
    out[key] = maskPII(raw, depth + 1);
  }
  return out as unknown as T;
}
