-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "apeCode" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "discountRate" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "facturxProfile" TEXT DEFAULT 'BASIC',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "website" TEXT;
