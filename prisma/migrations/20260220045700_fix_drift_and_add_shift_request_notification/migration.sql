-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHIFT_REQUEST';

-- AlterEnum
ALTER TYPE "invoice_status" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';

-- DropForeignKey
ALTER TABLE "ShiftRequest" DROP CONSTRAINT IF EXISTS "ShiftRequest_shiftId_fkey";

-- AlterTable
ALTER TABLE "ShiftRequest" DROP COLUMN IF EXISTS "requestedAt";

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectFormSettings" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectFormSettings_businessId_key" ON "ProjectFormSettings"("businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectFormSettings_businessId_idx" ON "ProjectFormSettings"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ShiftRequest_shiftId_employeeId_key" ON "ShiftRequest"("shiftId", "employeeId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectFormSettings_businessId_fkey') THEN
    ALTER TABLE "ProjectFormSettings" ADD CONSTRAINT "ProjectFormSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShiftRequest_shiftId_fkey') THEN
    ALTER TABLE "ShiftRequest" ADD CONSTRAINT "ShiftRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
