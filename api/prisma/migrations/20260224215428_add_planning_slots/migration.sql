-- CreateTable
CREATE TABLE "planning_slots" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planning_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planning_slots_companyId_idx" ON "planning_slots"("companyId");

-- CreateIndex
CREATE INDEX "planning_slots_userId_idx" ON "planning_slots"("userId");

-- CreateIndex
CREATE INDEX "planning_slots_jobId_idx" ON "planning_slots"("jobId");

-- CreateIndex
CREATE INDEX "planning_slots_date_idx" ON "planning_slots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "planning_slots_userId_date_key" ON "planning_slots"("userId", "date");

-- AddForeignKey
ALTER TABLE "planning_slots" ADD CONSTRAINT "planning_slots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_slots" ADD CONSTRAINT "planning_slots_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_slots" ADD CONSTRAINT "planning_slots_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
