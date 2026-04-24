import { describe, it, expect } from "vitest";
import {
  canonicalizeInvoice,
  computeInvoiceHmac,
  verifyInvoiceHmac,
} from "../../../api/src/invoices/invoice-integrity.lib";

const KEY = "0123456789abcdef0123456789abcdef0123456789abcdef";
const BASE = {
  id: "inv_1",
  reference: "FAC-ASP-2026-001",
  amount: 1000,
  vatRate: 20,
  issuedAt: new Date("2026-04-22T10:00:00Z"),
  dueDate: new Date("2026-05-22T10:00:00Z"),
  clientId: "cli_1",
  jobId: "job_1",
  companyId: "comp_1",
};

describe("invoice integrity — pure HMAC lib (V2.2)", () => {
  it("produces a stable HMAC for the same invoice", () => {
    const a = computeInvoiceHmac({ ...BASE }, KEY);
    const b = computeInvoiceHmac({ ...BASE }, KEY);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("yields a different hash when the amount changes by 1 cent", () => {
    const a = computeInvoiceHmac({ ...BASE }, KEY);
    const b = computeInvoiceHmac({ ...BASE, amount: 1000.01 }, KEY);
    expect(a).not.toBe(b);
  });

  it("yields a different hash when the key changes", () => {
    const a = computeInvoiceHmac({ ...BASE }, KEY);
    const b = computeInvoiceHmac({ ...BASE }, "0000000000000000000000000000000000000000");
    expect(a).not.toBe(b);
  });

  it("accepts Decimal-like objects via toString()", () => {
    const decimal = { toString: () => "1000" };
    const a = computeInvoiceHmac({ ...BASE, amount: decimal }, KEY);
    const b = computeInvoiceHmac({ ...BASE, amount: 1000 }, KEY);
    expect(a).toBe(b);
  });

  it("verify() returns ok=true for an untampered invoice", () => {
    const hash = computeInvoiceHmac({ ...BASE }, KEY);
    expect(verifyInvoiceHmac({ ...BASE }, hash, KEY).ok).toBe(true);
  });

  it("verify() returns ok=false when any legal field is changed", () => {
    const hash = computeInvoiceHmac({ ...BASE }, KEY);
    expect(verifyInvoiceHmac({ ...BASE, clientId: "cli_2" }, hash, KEY).ok).toBe(false);
  });

  it("verify() returns ok=false when the stored hash is missing", () => {
    expect(verifyInvoiceHmac({ ...BASE }, null, KEY).ok).toBe(false);
  });

  it("canonicalize() ignores key ordering at the call site", () => {
    const a = canonicalizeInvoice({ ...BASE });
    const reversed = {
      companyId: BASE.companyId,
      jobId: BASE.jobId,
      clientId: BASE.clientId,
      dueDate: BASE.dueDate,
      issuedAt: BASE.issuedAt,
      vatRate: BASE.vatRate,
      amount: BASE.amount,
      reference: BASE.reference,
      id: BASE.id,
    };
    expect(canonicalizeInvoice(reversed as any)).toBe(a);
  });

  it("canonicalize() normalises amounts to 4 decimals", () => {
    const a = canonicalizeInvoice({ ...BASE, amount: 1000 });
    const b = canonicalizeInvoice({ ...BASE, amount: 1000.0 });
    expect(a).toBe(b);
  });
});
