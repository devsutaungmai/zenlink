/*
  Warnings:

  - A unique constraint covering the columns `[business_id,year,sequence]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sequence` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `invoices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "sequence" INTEGER NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "invoices_business_id_year_sequence_idx" ON "invoices"("business_id", "year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_business_id_year_sequence_key" ON "invoices"("business_id", "year", "sequence");
