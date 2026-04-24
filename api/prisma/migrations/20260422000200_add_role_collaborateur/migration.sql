-- The `collaborateur` role was referenced throughout the codebase but missing
-- from the enum — fixed as part of V2 schema realignment.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'collaborateur';
