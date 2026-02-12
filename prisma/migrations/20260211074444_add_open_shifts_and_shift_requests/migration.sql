-- AlterEnum
ALTER TYPE "ShiftStatus" ADD VALUE 'OPEN';

-- CreateEnum
CREATE TYPE "ShiftRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ShiftRequest" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "note" TEXT,
    "status" "ShiftRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "respondedBy" TEXT,

    CONSTRAINT "ShiftRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftRequest_shiftId_idx" ON "ShiftRequest"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftRequest_employeeId_idx" ON "ShiftRequest"("employeeId");

-- CreateIndex
CREATE INDEX "ShiftRequest_status_idx" ON "ShiftRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftRequest_shiftId_employeeId_key" ON "ShiftRequest"("shiftId", "employeeId");

-- AddForeignKey
ALTER TABLE "ShiftRequest" ADD CONSTRAINT "ShiftRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRequest" ADD CONSTRAINT "ShiftRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
