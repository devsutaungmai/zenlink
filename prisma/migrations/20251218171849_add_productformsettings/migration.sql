-- CreateTable
CREATE TABLE "ProductFormSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "deviceId" TEXT,
    "showSalesPrice" BOOLEAN NOT NULL DEFAULT true,
    "showCostPrice" BOOLEAN NOT NULL DEFAULT true,
    "showDiscountPercentage" BOOLEAN NOT NULL DEFAULT true,
    "showUnit" BOOLEAN NOT NULL DEFAULT true,
    "showProductGroup" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFormSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductFormSettings_businessId_idx" ON "ProductFormSettings"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFormSettings_businessId_key" ON "ProductFormSettings"("businessId");

-- AddForeignKey
ALTER TABLE "ProductFormSettings" ADD CONSTRAINT "ProductFormSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
