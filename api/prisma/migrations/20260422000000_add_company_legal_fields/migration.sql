-- V2 — Add legal identifiers to companies so invoices can carry the mentions
-- mandated by French commercial law (Code de commerce art. L.441-9 and
-- Code général des impôts art. 242 nonies A).

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "legalForm" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "siren" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "siret" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "vatNumber" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "rcsCity" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "shareCapital" DECIMAL(14,2);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "addressLine1" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "countryCode" TEXT DEFAULT 'FR';
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "iban" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "bic" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "latePaymentRate" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "lateFeeFlat" DECIMAL(10,2) DEFAULT 40;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "legalRepresentative" TEXT;
