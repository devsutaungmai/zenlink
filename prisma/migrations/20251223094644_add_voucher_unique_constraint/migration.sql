/*
  Warnings:

  - A unique constraint covering the columns `[businessId,year,sequence]` on the table `Voucher` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Voucher_businessId_year_sequence_key" ON "Voucher"("businessId", "year", "sequence");
