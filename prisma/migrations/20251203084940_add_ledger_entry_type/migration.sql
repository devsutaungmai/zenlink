-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('INVOICE_POST', 'PAYMENT_RECEIVED', 'CREDIT_NOTE', 'MANUAL_ADJUSTMENT');

-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN     "entry_type" "LedgerEntryType" NOT NULL DEFAULT 'INVOICE_POST';
