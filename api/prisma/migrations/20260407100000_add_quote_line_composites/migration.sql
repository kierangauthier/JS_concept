-- CreateEnum
CREATE TYPE "LineDisplayMode" AS ENUM ('detailed', 'grouped', 'mixed');

-- AlterTable: add composite/hierarchy fields to quote_lines
ALTER TABLE "quote_lines" ADD COLUMN "isComposite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "quote_lines" ADD COLUMN "parentId" TEXT;
ALTER TABLE "quote_lines" ADD COLUMN "displayMode" "LineDisplayMode";
ALTER TABLE "quote_lines" ADD COLUMN "visibleToClient" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "quote_lines" ADD COLUMN "adjustmentAmount" DECIMAL(10,2);
ALTER TABLE "quote_lines" ADD COLUMN "adjustmentLabel" TEXT;
ALTER TABLE "quote_lines" ADD COLUMN "catalogProductId" TEXT;

-- CreateIndex
CREATE INDEX "quote_lines_parentId_idx" ON "quote_lines"("parentId");

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "quote_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
