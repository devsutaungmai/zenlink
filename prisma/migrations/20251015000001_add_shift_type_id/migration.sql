-- AlterTable
ALTER TABLE "Shift" ADD COLUMN "shiftTypeId" TEXT;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_shiftTypeId_fkey" FOREIGN KEY ("shiftTypeId") REFERENCES "ShiftTypeConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Shift_shiftTypeId_idx" ON "Shift"("shiftTypeId");
