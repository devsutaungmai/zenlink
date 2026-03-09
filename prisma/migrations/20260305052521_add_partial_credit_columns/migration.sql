-- AlterEnum
ALTER TYPE "invoice_status" ADD VALUE 'PARTIALLY_CREDITED';

-- AlterTable
ALTER TABLE "invoice_lines" ADD COLUMN     "isCredited" BOOLEAN NOT NULL DEFAULT false;
