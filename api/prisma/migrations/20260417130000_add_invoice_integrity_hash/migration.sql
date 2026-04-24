-- I7 security fix: invoice immutability
-- Adds a SHA-256 integrity hash column (set when an invoice is emitted) so
-- that any post-issuance tampering can be detected.

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "integrityHash" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "integrityHashAt" TIMESTAMP(3);

-- Intentionally NOT UNIQUE: two distinct invoices could theoretically produce
-- the same hash only on payload collision (infeasible for SHA-256), but we
-- keep the column nullable for draft/legacy rows without retrofitting.
CREATE INDEX IF NOT EXISTS "invoices_integrityHash_idx"
  ON "invoices" ("integrityHash");
