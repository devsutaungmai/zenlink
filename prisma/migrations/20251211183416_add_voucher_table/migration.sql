/*
  Warnings:

  - A unique constraint covering the columns `[voucherId]` on the table `CustomerPayment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[voucherId]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `voucherId` to the `ledger_entries` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'MANUAL');

-- AlterTable
ALTER TABLE "CustomerPayment" ADD COLUMN     "voucherId" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "voucherId" TEXT;

-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN     "voucherId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "type" "VoucherType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_voucherNumber_key" ON "Voucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "Voucher_businessId_year_sequence_idx" ON "Voucher"("businessId", "year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPayment_voucherId_key" ON "CustomerPayment"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_voucherId_key" ON "invoices"("voucherId");

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
