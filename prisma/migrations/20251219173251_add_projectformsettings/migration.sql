-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_departmentId_fkey";

-- AlterTable
ALTER TABLE "Employee" ALTER COLUMN "departmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "InvoiceFormSettings" ADD COLUMN     "showNote" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ProjectFormSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "deviceId" TEXT,
    "showCategory" BOOLEAN NOT NULL DEFAULT true,
    "showCustomer" BOOLEAN NOT NULL DEFAULT true,
    "showStartDate" BOOLEAN NOT NULL DEFAULT true,
    "showEndDate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFormSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFormSettings_businessId_key" ON "ProjectFormSettings"("businessId");

-- CreateIndex
CREATE INDEX "ProjectFormSettings_businessId_idx" ON "ProjectFormSettings"("businessId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFormSettings" ADD CONSTRAINT "ProjectFormSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
