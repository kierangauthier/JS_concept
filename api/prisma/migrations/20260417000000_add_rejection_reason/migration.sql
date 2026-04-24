-- AddColumn rejectionReason to time_entries
ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- AddColumn rejectionReason to absences (already in schema, applying to DB)
ALTER TABLE "absences" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
