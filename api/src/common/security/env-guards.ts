/**
 * V1 / V5 — Environment hardening.
 *
 * Centralises the list of env vars required in production and exposes typed
 * accessors for the most sensitive ones. The boot process calls
 * `assertProductionEnv()` once — if anything is missing, the process dies
 * rather than coming up with a broken security posture.
 */

const REQUIRED_IN_PROD = [
  'JWT_SECRET',
  'DATABASE_URL',
  'CORS_ORIGINS',
  'INVOICE_HMAC_KEY',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
] as const;

const MIN_SECRET_LENGTH = 32;

function devFallback(label: string): string {
  // Ephemeral, process-local dev secret. Logged loudly so dev is aware.
  // eslint-disable-next-line no-console
  console.warn(
    `[security] ${label} missing — using an ephemeral dev secret. This WILL break anything it signs across restarts.`,
  );
  return 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < MIN_SECRET_LENGTH) {
    const err = `${name} is missing or shorter than ${MIN_SECRET_LENGTH} chars. Generate with \`openssl rand -base64 48\`.`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[security] ${err}`);
    }
    return devFallback(name);
  }
  return value;
}

export function getJwtSecret(): string {
  return requireSecret('JWT_SECRET');
}

export function getInvoiceHmacKey(): string {
  return requireSecret('INVOICE_HMAC_KEY');
}

export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const missing = REQUIRED_IN_PROD.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[security] Missing required production env vars: ${missing.join(', ')}`,
    );
  }
  // Length checks on secrets (fail fast).
  for (const k of ['JWT_SECRET', 'INVOICE_HMAC_KEY'] as const) {
    if ((process.env[k]?.length ?? 0) < MIN_SECRET_LENGTH) {
      throw new Error(
        `[security] ${k} must be at least ${MIN_SECRET_LENGTH} characters in production`,
      );
    }
  }
}
