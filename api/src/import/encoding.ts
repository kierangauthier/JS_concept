/**
 * CSV encoding detection and decoding.
 * Handles UTF-8 (with/without BOM) and Latin1/Windows-1252 (common in French Excel exports).
 */

export function detectEncoding(buffer: Buffer): 'utf-8' | 'latin1' {
  // UTF-8 BOM
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'utf-8';
  }

  // Try UTF-8 decode — if no replacement characters, it's valid UTF-8
  const text = buffer.toString('utf-8');
  if (!text.includes('\uFFFD')) {
    // Check for common Latin1 misinterpretation patterns (e.g. Ã© instead of é)
    if (/\xC3[\x80-\xBF]/.test(text)) return 'utf-8';
    // Check if high bytes exist without valid UTF-8 multibyte sequences
    let hasHighByte = false;
    for (let i = 0; i < Math.min(buffer.length, 4096); i++) {
      if (buffer[i] > 0x7f) {
        hasHighByte = true;
        // Validate UTF-8 sequence
        if (buffer[i] >= 0xc2 && buffer[i] <= 0xdf) {
          if (i + 1 < buffer.length && buffer[i + 1] >= 0x80 && buffer[i + 1] <= 0xbf) {
            i++; // Valid 2-byte UTF-8
            continue;
          }
          return 'latin1'; // Invalid UTF-8 sequence
        }
        if (buffer[i] >= 0xe0 && buffer[i] <= 0xef) {
          if (i + 2 < buffer.length && buffer[i + 1] >= 0x80 && buffer[i + 2] >= 0x80) {
            i += 2; // Valid 3-byte UTF-8
            continue;
          }
          return 'latin1';
        }
        if (buffer[i] >= 0x80 && buffer[i] <= 0xbf) {
          return 'latin1'; // Continuation byte without start = Latin1
        }
      }
    }
    if (!hasHighByte) return 'utf-8';
    return 'utf-8';
  }

  return 'latin1';
}

export function decodeCSV(buffer: Buffer): string {
  const encoding = detectEncoding(buffer);
  if (encoding === 'utf-8') {
    // Strip BOM if present
    return buffer.toString('utf-8').replace(/^\uFEFF/, '');
  }
  // Latin1 / Windows-1252
  const decoder = new TextDecoder('windows-1252');
  return decoder.decode(buffer);
}
