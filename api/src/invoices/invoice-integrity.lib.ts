/**
 * Pure, dependency-free integrity helpers used by InvoiceIntegrityService.
 *
 * Kept separate from the Nest service so it can be imported directly by tests
 * (and, in the future, by a CLI or a worker) without pulling the Nest runtime.
 */
import { createHmac } from "node:crypto";

export interface IntegrityInvoice {
  id: string;
  reference: string;
  amount: number | string | { toString(): string };
  vatRate?: number | string | { toString(): string } | null;
  issuedAt: Date;
  dueDate: Date;
  clientId?: string | null;
  jobId?: string | null;
  companyId: string;
}

/** Canonical JSON of the legally significant invoice fields. Key order fixed. */
export function canonicalizeInvoice(invoice: IntegrityInvoice): string {
  const num = (v: number | string | { toString(): string } | null | undefined) =>
    v === null || v === undefined ? null : Number(v.toString()).toFixed(4);
  const iso = (d: Date) => d.toISOString();

  return JSON.stringify({
    id: invoice.id,
    reference: invoice.reference,
    amount: num(invoice.amount),
    vatRate: num(invoice.vatRate ?? null),
    issuedAt: iso(invoice.issuedAt),
    dueDate: iso(invoice.dueDate),
    clientId: invoice.clientId ?? null,
    jobId: invoice.jobId ?? null,
    companyId: invoice.companyId,
  });
}

export function computeInvoiceHmac(invoice: IntegrityInvoice, key: string): string {
  return createHmac("sha256", key).update(canonicalizeInvoice(invoice)).digest("hex");
}

export function verifyInvoiceHmac(
  invoice: IntegrityInvoice,
  storedHash: string | null,
  key: string,
): { ok: boolean; expected?: string } {
  if (!storedHash) return { ok: false };
  const expected = computeInvoiceHmac(invoice, key);
  return { ok: expected === storedHash, expected };
}
