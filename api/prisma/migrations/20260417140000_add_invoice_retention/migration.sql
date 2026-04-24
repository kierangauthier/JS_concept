-- I8 security/compliance fix: 10-year invoice retention policy.
-- Adds flag `archivalPending` (marked 12 months before the legal retention
-- window ends) and `archivedAt` (set by an operator or automation once the
-- invoice has been copied to long-term cold storage).

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "archivalPending" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "invoices_archivalPending_idx"
  ON "invoices" ("archivalPending")
  WHERE "archivalPending" = true;
