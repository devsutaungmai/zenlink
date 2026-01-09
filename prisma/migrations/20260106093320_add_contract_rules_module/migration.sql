-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'SEASONAL_TEMPORARY', 'HOURLY', 'MONTHLY_SALARY');

-- CreateEnum
CREATE TYPE "OvertimeExemption" AS ENUM ('MANAGERIAL_POSITION', 'HIGHLY_INDEPENDENT_POSITION');

-- CreateEnum
CREATE TYPE "ContractWarningType" AS ENUM ('YELLOW_IN_PLANNER', 'EMAIL_NOTIFICATION', 'BLOCK_SCHEDULING');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "contractTypeId" TEXT,
ADD COLUMN     "ftePercent" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "LaborLawProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "laborLawSettingsId" TEXT,
    "businessId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaborLawProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "defaultFtePercent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "agreedWeeklyHours" DOUBLE PRECISION,
    "maxPlannedWeeklyHours" DOUBLE PRECISION,
    "overtimeAllowed" BOOLEAN NOT NULL DEFAULT true,
    "overtimeExemption" "OvertimeExemption",
    "maxWeekendsPerMonth" INTEGER,
    "customBreakMinutes" INTEGER,
    "warningType" "ContractWarningType" NOT NULL DEFAULT 'YELLOW_IN_PLANNER',
    "notifyManagerOnDeviation" BOOLEAN NOT NULL DEFAULT false,
    "allowSchedulingWithDeviation" BOOLEAN NOT NULL DEFAULT true,
    "laborLawProfileId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LaborLawProfile_businessId_idx" ON "LaborLawProfile"("businessId");

-- CreateIndex
CREATE INDEX "LaborLawProfile_laborLawSettingsId_idx" ON "LaborLawProfile"("laborLawSettingsId");

-- CreateIndex
CREATE UNIQUE INDEX "LaborLawProfile_name_businessId_key" ON "LaborLawProfile"("name", "businessId");

-- CreateIndex
CREATE INDEX "ContractType_businessId_idx" ON "ContractType"("businessId");

-- CreateIndex
CREATE INDEX "ContractType_laborLawProfileId_idx" ON "ContractType"("laborLawProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractType_name_businessId_key" ON "ContractType"("name", "businessId");

-- CreateIndex
CREATE INDEX "Employee_contractTypeId_idx" ON "Employee"("contractTypeId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_contractTypeId_fkey" FOREIGN KEY ("contractTypeId") REFERENCES "ContractType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborLawProfile" ADD CONSTRAINT "LaborLawProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborLawProfile" ADD CONSTRAINT "LaborLawProfile_laborLawSettingsId_fkey" FOREIGN KEY ("laborLawSettingsId") REFERENCES "LaborLawSettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractType" ADD CONSTRAINT "ContractType_laborLawProfileId_fkey" FOREIGN KEY ("laborLawProfileId") REFERENCES "LaborLawProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractType" ADD CONSTRAINT "ContractType_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
