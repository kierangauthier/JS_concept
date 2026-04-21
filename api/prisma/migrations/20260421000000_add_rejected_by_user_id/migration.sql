-- Track who rejected a time entry or an absence, for audit trail.
ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "rejectedByUserId" TEXT;
ALTER TABLE "absences" ADD COLUMN IF NOT EXISTS "rejectedByUserId" TEXT;
