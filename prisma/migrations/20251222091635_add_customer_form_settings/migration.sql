-- CreateTable
CREATE TABLE "CustomerFormSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "deviceId" TEXT,
    "showOrganizationNumber" BOOLEAN NOT NULL DEFAULT true,
    "showAddress" BOOLEAN NOT NULL DEFAULT true,
    "showPostalCode" BOOLEAN NOT NULL DEFAULT true,
    "showPostalAddress" BOOLEAN NOT NULL DEFAULT true,
    "showPhoneNumber" BOOLEAN NOT NULL DEFAULT true,
    "showEmail" BOOLEAN NOT NULL DEFAULT true,
    "showDiscountPercentage" BOOLEAN NOT NULL DEFAULT true,
    "showDeliveryAddress" BOOLEAN NOT NULL DEFAULT true,
    "showDeliveryAddressPostalCode" BOOLEAN NOT NULL DEFAULT true,
    "showDeliveryAddressPostalAddress" BOOLEAN NOT NULL DEFAULT true,
    "showDepartment" BOOLEAN NOT NULL DEFAULT true,
    "showInvoicePaymentTerms" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFormSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFormSettings_businessId_key" ON "CustomerFormSettings"("businessId");

-- CreateIndex
CREATE INDEX "CustomerFormSettings_businessId_idx" ON "CustomerFormSettings"("businessId");

-- AddForeignKey
ALTER TABLE "CustomerFormSettings" ADD CONSTRAINT "CustomerFormSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
