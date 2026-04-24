/**
 * A5 — Field-level encryption for sensitive columns (SIRET, numéro TVA,
 * IBAN …). Uses AES-256-GCM with a random IV and the GCM authentication
 * tag concatenated as the stored ciphertext blob.
 *
 * Stored format (base64 of IV ‖ ciphertext ‖ authTag):
 *
 *   +------------+-----------------+-----------+
 *   | IV (12 B)  | ciphertext (N)  | tag (16B) |
 *   +------------+-----------------+-----------+
 *
 * The key is derived from the env var `ENCRYPTION_KEY` (hex-encoded 32B,
 * i.e. 64 hex chars) loaded once at startup. If the variable is missing,
 * the helpers operate as a no-op and emit a warning at boot — this makes
 * the pilot run out-of-the-box while leaving a clear toggle for production.
 *
 * Rotation strategy:
 *   - prepend a single-byte version header to stored blobs (0x01 today)
 *   - on read, dispatch to the right decryption routine based on the header
 *   - this lets us migrate to 0x02 (e.g. AES-256-GCM-SIV) without rewriting
 *     the whole table in a single deploy.
 */
import * as crypto from 'crypto';

const VERSION_BYTE = 0x01;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
/** Marker prefix that distinguishes ciphertexts from plain legacy values. */
const CIPHERTEXT_PREFIX = 'enc:v1:';

let cachedKey: Buffer | null = null;
let warned = false;

/** Return the encryption key, or null if the env var is absent / malformed. */
function getKey(): Buffer | null {
  if (cachedKey) return cachedKey;
  const hex = process.env.ENCRYPTION_KEY?.trim();
  if (!hex) {
    if (!warned) {
      console.warn(
        '[FieldCrypto] ENCRYPTION_KEY not set — sensitive DB fields are stored in plain text',
      );
      warned = true;
    }
    return null;
  }
  try {
    const key = Buffer.from(hex, 'hex');
    if (key.length !== KEY_LENGTH) {
      throw new Error(`key length must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars)`);
    }
    cachedKey = key;
    return key;
  } catch (err: any) {
    if (!warned) {
      console.error(
        `[FieldCrypto] ENCRYPTION_KEY invalid (${err?.message ?? err}) — sensitive fields are NOT encrypted`,
      );
      warned = true;
    }
    return null;
  }
}

export function isFieldCryptoEnabled(): boolean {
  return getKey() !== null;
}

/**
 * Encrypt a string field. Passes through unchanged when no key is available.
 * Idempotent: values already prefixed with "enc:v1:" are returned as-is.
 */
export function encryptField(plain: string | null | undefined): string | null | undefined {
  if (plain == null) return plain;
  if (typeof plain !== 'string' || plain === '') return plain;
  if (plain.startsWith(CIPHERTEXT_PREFIX)) return plain; // already encrypted
  const key = getKey();
  if (!key) return plain;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([Buffer.of(VERSION_BYTE), iv, ct, tag]);
  return CIPHERTEXT_PREFIX + payload.toString('base64');
}

/**
 * Decrypt a field. Legacy plain-text values (no "enc:v1:" prefix) are
 * returned as-is so mixed-state tables behave correctly during rollout.
 */
export function decryptField(cipher: string | null | undefined): string | null | undefined {
  if (cipher == null) return cipher;
  if (typeof cipher !== 'string' || !cipher.startsWith(CIPHERTEXT_PREFIX)) return cipher;
  const key = getKey();
  if (!key) {
    // Key missing — surface blob as-is; caller sees the prefix and can
    // distinguish from plain values. Deterministic and never throws.
    return cipher;
  }
  try {
    const payload = Buffer.from(cipher.slice(CIPHERTEXT_PREFIX.length), 'base64');
    const version = payload[0];
    if (version !== VERSION_BYTE) {
      throw new Error(`unknown ciphertext version 0x${version.toString(16)}`);
    }
    const iv = payload.subarray(1, 1 + IV_LENGTH);
    const ct = payload.subarray(1 + IV_LENGTH, payload.length - TAG_LENGTH);
    const tag = payload.subarray(payload.length - TAG_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
  } catch (err: any) {
    console.error('[FieldCrypto] decrypt failed:', err?.message ?? err);
    return null;
  }
}
