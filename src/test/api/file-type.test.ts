import { describe, it, expect } from "vitest";
import { sniffMime, assertMime } from "../../../api/src/common/security/file-type";

function buf(...bytes: number[]): Buffer {
  return Buffer.from(bytes);
}

describe("magic-byte mime sniffer (V1.9)", () => {
  it("detects PDF", () => {
    expect(sniffMime(buf(0x25, 0x50, 0x44, 0x46, 0x2d))).toBe("application/pdf");
  });

  it("detects PNG", () => {
    expect(sniffMime(buf(0x89, 0x50, 0x4e, 0x47, 0x0d))).toBe("image/png");
  });

  it("detects JPEG", () => {
    expect(sniffMime(buf(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });

  it("detects ZIP / OOXML marker", () => {
    expect(sniffMime(buf(0x50, 0x4b, 0x03, 0x04))).toBe("application/zip");
  });

  it("detects CSV-like plain text", () => {
    const csv = Buffer.from("name,email\nAlice,a@b.fr\n");
    expect(sniffMime(csv)).toBe("text/csv");
  });

  it("returns 'unknown' for binary garbage", () => {
    expect(sniffMime(buf(0x00, 0x01, 0x02))).toBe("unknown");
  });
});

describe("assertMime()", () => {
  it("throws when the detected type is not in the accept list", () => {
    expect(() =>
      assertMime(Buffer.from("%PDF-1.4"), {
        accept: ["image/png"],
        filename: "evil.pdf",
      }),
    ).toThrow(/refus/);
  });

  it("throws when the buffer exceeds maxBytes", () => {
    const big = Buffer.alloc(1024 * 1024);
    big.write("%PDF-1.4");
    expect(() =>
      assertMime(big, {
        accept: ["application/pdf"],
        maxBytes: 1024,
        filename: "huge.pdf",
      }),
    ).toThrow(/trop volumineux/);
  });

  it("returns the detected type when everything matches", () => {
    const detected = assertMime(Buffer.from("%PDF-1.4"), {
      accept: ["application/pdf"],
      maxBytes: 10 * 1024,
    });
    expect(detected).toBe("application/pdf");
  });
});
