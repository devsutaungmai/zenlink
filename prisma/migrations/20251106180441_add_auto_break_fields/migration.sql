-- CreateEnum
CREATE TYPE "AutoBreakType" AS ENUM ('AUTO_BREAK', 'MANUAL_BREAK');

-- AlterEnum
ALTER TYPE "ShiftType" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "ShiftTypeConfig" ADD COLUMN     "autoBreakType" "AutoBreakType" NOT NULL DEFAULT 'MANUAL_BREAK',
ADD COLUMN     "autoBreakValue" DECIMAL(10,2);
