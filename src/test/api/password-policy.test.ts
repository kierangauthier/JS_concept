import { describe, it, expect } from "vitest";
import {
  validatePassword,
  assertStrongPassword,
  BCRYPT_ROUNDS,
} from "../../../api/src/common/security/password.policy";

describe("password policy (V1.4)", () => {
  it("requires at least 12 characters", () => {
    const { ok, errors } = validatePassword("Aa1!short");
    expect(ok).toBe(false);
    expect(errors.some((e) => e.includes("12 caractères"))).toBe(true);
  });

  it("requires an uppercase letter", () => {
    const { ok, errors } = validatePassword("abcdefg1234!");
    expect(ok).toBe(false);
    expect(errors.some((e) => e.toLowerCase().includes("majuscule"))).toBe(true);
  });

  it("requires a lowercase letter", () => {
    const { ok, errors } = validatePassword("ABCDEFG1234!");
    expect(ok).toBe(false);
    expect(errors.some((e) => e.toLowerCase().includes("minuscule"))).toBe(true);
  });

  it("requires a digit", () => {
    const { ok, errors } = validatePassword("Abcdefghijk!");
    expect(ok).toBe(false);
    expect(errors.some((e) => e.toLowerCase().includes("chiffre"))).toBe(true);
  });

  it("requires a special character", () => {
    const { ok, errors } = validatePassword("Abcdefghij123");
    expect(ok).toBe(false);
    expect(errors.some((e) => e.toLowerCase().includes("spécial"))).toBe(true);
  });

  it("accepts a strong password", () => {
    const { ok, errors } = validatePassword("ValidPassw0rd!");
    expect(ok).toBe(true);
    expect(errors).toEqual([]);
  });

  it("assertStrongPassword throws BadRequestException with the list of errors", () => {
    try {
      assertStrongPassword("weak");
      throw new Error("should have thrown");
    } catch (e: any) {
      // @nestjs/common BadRequestException exposes its payload on `getResponse()`.
      const payload = e.getResponse?.() ?? e.response ?? e.message;
      const text = JSON.stringify(payload);
      expect(text).toContain("Mot de passe non conforme");
      expect(text).toContain("12 caractères");
    }
  });

  it("uses bcrypt rounds ≥ 12 (V1.6)", () => {
    expect(BCRYPT_ROUNDS).toBeGreaterThanOrEqual(12);
  });
});
