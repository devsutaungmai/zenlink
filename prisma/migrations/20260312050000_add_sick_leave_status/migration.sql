-- CreateEnum
CREATE TYPE "SickLeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "SickLeave" ADD COLUMN "status" "SickLeaveStatus" NOT NULL DEFAULT 'PENDING';

-- Backfill existing rows
UPDATE "SickLeave"
SET "status" = CASE
  WHEN "approved" = true THEN 'APPROVED'::"SickLeaveStatus"
  ELSE 'PENDING'::"SickLeaveStatus"
END;
