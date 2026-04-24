-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 20;
