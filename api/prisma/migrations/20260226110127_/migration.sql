/*
  Warnings:

  - The values [DRAFT,SUBMITTED,APPROVED,REJECTED] on the enum `TimeEntryStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `updatedAt` to the `invoice_situations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "InvoiceSituationStatus" ADD VALUE 'validated';

-- AlterEnum
BEGIN;
CREATE TYPE "TimeEntryStatus_new" AS ENUM ('draft', 'submitted', 'approved', 'rejected');
ALTER TABLE "time_entries" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "time_entries" ALTER COLUMN "status" TYPE "TimeEntryStatus_new" USING ("status"::text::"TimeEntryStatus_new");
ALTER TYPE "TimeEntryStatus" RENAME TO "TimeEntryStatus_old";
ALTER TYPE "TimeEntryStatus_new" RENAME TO "TimeEntryStatus";
DROP TYPE "TimeEntryStatus_old";
ALTER TABLE "time_entries" ALTER COLUMN "status" SET DEFAULT 'draft';
COMMIT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "invoice_situations" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cumulativeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "time_entries" ALTER COLUMN "status" SET DEFAULT 'draft';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "workshop_items" ADD COLUMN     "deletedAt" TIMESTAMP(3);
