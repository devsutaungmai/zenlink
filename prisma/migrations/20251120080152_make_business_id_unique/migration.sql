/*
  Warnings:

  - A unique constraint covering the columns `[businessId]` on the table `InvoiceFormSettings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "InvoiceFormSettings_businessId_deviceId_key";

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceFormSettings_businessId_key" ON "InvoiceFormSettings"("businessId");
