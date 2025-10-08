-- CreateEnum
CREATE TYPE "PayCalculationType" AS ENUM ('HOURLY_PLUS_FIXED', 'FIXED_AMOUNT', 'PERCENTAGE', 'UNPAID');

-- AlterTable
ALTER TABLE "Department" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "EmployeeGroupPayRule" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PayRule" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ShiftTypeConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "salaryCode" TEXT NOT NULL,
    "payCalculationType" "PayCalculationType" NOT NULL,
    "payCalculationValue" DECIMAL(10,2),
    "description" TEXT,
    "businessId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftTypeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftTypeConfig_businessId_isActive_idx" ON "ShiftTypeConfig"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftTypeConfig_name_businessId_key" ON "ShiftTypeConfig"("name", "businessId");

-- AddForeignKey
ALTER TABLE "ShiftTypeConfig" ADD CONSTRAINT "ShiftTypeConfig_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
