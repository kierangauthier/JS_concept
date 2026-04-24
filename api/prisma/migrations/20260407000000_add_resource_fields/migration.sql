-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('terrain', 'bureau');
CREATE TYPE "UserJobFunction" AS ENUM ('technicien', 'graphiste', 'conducteur_travaux', 'bureau_etude', 'autre');

-- AlterEnum: add 'collaborateur' to UserRole
ALTER TYPE "UserRole" ADD VALUE 'collaborateur';

-- AlterTable: add type, jobFunction, hourlyRate to users
ALTER TABLE "users" ADD COLUMN "type" "UserType" NOT NULL DEFAULT 'terrain';
ALTER TABLE "users" ADD COLUMN "jobFunction" "UserJobFunction" NOT NULL DEFAULT 'technicien';
ALTER TABLE "users" ADD COLUMN "hourlyRate" DECIMAL(8,2);

-- AlterTable: add hourlyRate, removedAt to job_assignments
ALTER TABLE "job_assignments" ADD COLUMN "hourlyRate" DECIMAL(8,2);
ALTER TABLE "job_assignments" ADD COLUMN "removedAt" TIMESTAMP(3);
