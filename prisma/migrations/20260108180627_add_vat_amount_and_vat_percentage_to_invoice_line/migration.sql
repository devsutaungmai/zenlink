/*
  Warnings:

  - You are about to drop the column `vat_percentage` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "invoice_lines" ADD COLUMN     "vat_amount" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "vat_percentage" DECIMAL(5,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "vat_percentage";
