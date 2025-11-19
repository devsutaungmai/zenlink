-- CreateTable
CREATE TABLE "InvoiceFormSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "deviceId" TEXT,
    "showContactPerson" BOOLEAN NOT NULL DEFAULT true,
    "showDeliveryAddress" BOOLEAN NOT NULL DEFAULT true,
    "showPaymentTerms" BOOLEAN NOT NULL DEFAULT true,
    "showDepartment" BOOLEAN NOT NULL DEFAULT true,
    "showSeller" BOOLEAN NOT NULL DEFAULT true,
    "showDiscount" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceFormSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceFormSettings_businessId_idx" ON "InvoiceFormSettings"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceFormSettings_businessId_deviceId_key" ON "InvoiceFormSettings"("businessId", "deviceId");

-- AddForeignKey
ALTER TABLE "InvoiceFormSettings" ADD CONSTRAINT "InvoiceFormSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
