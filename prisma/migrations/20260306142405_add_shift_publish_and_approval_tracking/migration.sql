-- AlterTable
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Shift_isPublished_idx" ON "Shift"("isPublished");
