import { BadRequestException } from '@nestjs/common';

/**
 * Lightweight magic-byte sniffer — no runtime dependency.
 * Covers the file types the product actually accepts today.
 */
export type DetectedMime =
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/gif'
  | 'text/csv'
  | 'text/plain'
  | 'application/zip'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'unknown';

export function sniffMime(buffer: Buffer): DetectedMime {
  if (!buffer || buffer.length < 4) return 'unknown';
  const b = buffer;

  // PDF: "%PDF-"
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
    return 'application/pdf';
  }
  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return 'image/jpeg';
  }
  // GIF: "GIF87a" / "GIF89a"
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) {
    return 'image/gif';
  }
  // WEBP: "RIFF????WEBP"
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return 'image/webp';
  }
  // ZIP / OOXML: "PK\x03\x04". We can't trivially distinguish XLSX/DOCX/ZIP here
  // without unpacking; callers that need that distinction must inspect the
  // central directory themselves.
  if (b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05) && (b[3] === 0x04 || b[3] === 0x06)) {
    return 'application/zip';
  }

  // Heuristic fallback: UTF-8 text / CSV only if the buffer is printable.
  const sample = b.subarray(0, Math.min(b.length, 512)).toString('utf8');
  const printable = sample.replace(/[\x09\x0a\x0d\x20-\x7e -￿]/g, '');
  if (printable.length / Math.max(sample.length, 1) < 0.05) {
    if (sample.includes(',') && sample.includes('\n')) return 'text/csv';
    return 'text/plain';
  }

  return 'unknown';
}

export interface AssertMimeOptions {
  /** Accepted MIME types. */
  accept: DetectedMime[];
  /** Optional max size in bytes; throws 400 when exceeded. */
  maxBytes?: number;
  /** Human-readable name used in error messages. */
  filename?: string;
}

/**
 * Validates that a buffer matches one of the accepted MIME types (by magic
 * bytes) and is under the size limit. Throws a BadRequestException otherwise.
 */
export function assertMime(buffer: Buffer, opts: AssertMimeOptions): DetectedMime {
  const name = opts.filename ?? 'upload';
  if (opts.maxBytes !== undefined && buffer.length > opts.maxBytes) {
    throw new BadRequestException(
      `Fichier ${name} trop volumineux (${buffer.length} > ${opts.maxBytes} octets)`,
    );
  }
  const detected = sniffMime(buffer);
  if (!opts.accept.includes(detected)) {
    throw new BadRequestException(
      `Fichier ${name} refusé : type détecté "${detected}", attendu ${opts.accept.join(', ')}`,
    );
  }
  return detected;
}
