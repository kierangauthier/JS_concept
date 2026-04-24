-- Add composite line (ouvrage) support to invoice_lines
-- Mirrors the same structure already on quote_lines

ALTER TABLE "invoice_lines" ADD COLUMN "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "invoice_lines" ADD COLUMN "isComposite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invoice_lines" ADD COLUMN "parentId" TEXT;
ALTER TABLE "invoice_lines" ADD COLUMN "displayMode" "LineDisplayMode";
ALTER TABLE "invoice_lines" ADD COLUMN "visibleToClient" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "invoice_lines" ADD COLUMN "adjustmentAmount" DECIMAL(12,2);
ALTER TABLE "invoice_lines" ADD COLUMN "adjustmentLabel" TEXT;

-- Self-referencing index and foreign key
CREATE INDEX "invoice_lines_parentId_idx" ON "invoice_lines"("parentId");
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "invoice_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
