-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "responsableId" TEXT;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
