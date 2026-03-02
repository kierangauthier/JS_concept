-- CreateEnum
CREATE TYPE "TeamPlanningStatus" AS ENUM ('draft', 'locked');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('AM', 'PM');

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "roleInTeam" TEXT,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeTo" TIMESTAMP(3),
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_planning_weeks" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "status" "TeamPlanningStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "lockedAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "lockedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_planning_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_planning_slots" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeSlot" "TimeSlot" NOT NULL,
    "notes" TEXT,
    "weekId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,

    CONSTRAINT "team_planning_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning_dispatch_logs" (
    "id" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentByUserId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "recipients" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "htmlContent" TEXT,
    "weekId" TEXT NOT NULL,

    CONSTRAINT "planning_dispatch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_documents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "uploadedByUserId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teams_companyId_idx" ON "teams"("companyId");

-- CreateIndex
CREATE INDEX "team_members_teamId_userId_idx" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_planning_weeks_companyId_weekStart_key" ON "team_planning_weeks"("companyId", "weekStart");

-- CreateIndex
CREATE INDEX "team_planning_slots_weekId_idx" ON "team_planning_slots"("weekId");

-- CreateIndex
CREATE INDEX "team_planning_slots_jobId_idx" ON "team_planning_slots"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "team_planning_slots_teamId_weekId_date_timeSlot_key" ON "team_planning_slots"("teamId", "weekId", "date", "timeSlot");

-- CreateIndex
CREATE INDEX "planning_dispatch_logs_weekId_idx" ON "planning_dispatch_logs"("weekId");

-- CreateIndex
CREATE INDEX "hr_documents_userId_idx" ON "hr_documents"("userId");

-- CreateIndex
CREATE INDEX "hr_documents_companyId_idx" ON "hr_documents"("companyId");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_planning_weeks" ADD CONSTRAINT "team_planning_weeks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_planning_weeks" ADD CONSTRAINT "team_planning_weeks_lockedByUserId_fkey" FOREIGN KEY ("lockedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_planning_slots" ADD CONSTRAINT "team_planning_slots_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "team_planning_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_planning_slots" ADD CONSTRAINT "team_planning_slots_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_planning_slots" ADD CONSTRAINT "team_planning_slots_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_dispatch_logs" ADD CONSTRAINT "planning_dispatch_logs_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "team_planning_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_documents" ADD CONSTRAINT "hr_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_documents" ADD CONSTRAINT "hr_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
