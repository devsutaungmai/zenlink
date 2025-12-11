-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "invoice_status" ADD VALUE 'CREDITED';
ALTER TYPE "invoice_status" ADD VALUE 'CREDIT_NOTE';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "credited_invoice_id" TEXT;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_credited_invoice_id_fkey" FOREIGN KEY ("credited_invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
