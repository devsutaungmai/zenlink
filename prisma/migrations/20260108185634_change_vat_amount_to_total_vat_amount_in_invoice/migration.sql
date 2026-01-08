/*
  Warnings:

  - You are about to drop the column `vat_amount` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "vat_amount",
ADD COLUMN     "total_vat_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
