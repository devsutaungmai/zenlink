-- 1. Create Enum
CREATE TYPE "AutoBreakType" AS ENUM ('AUTO_BREAK', 'MANUAL_BREAK');

-- 2. Add Columns
ALTER TABLE "ShiftTypeConfig"
ADD COLUMN "autoBreakType" "AutoBreakType" NOT NULL DEFAULT 'MANUAL_BREAK',
ADD COLUMN "autoBreakValue" NUMERIC(10,2);
