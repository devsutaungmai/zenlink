-- Fix ScheduleTemplateShift table schema to match Prisma schema
-- This migration is idempotent and safe to run multiple times

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'dayOfWeek'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'dayIndex'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" RENAME COLUMN "dayOfWeek" TO "dayIndex";
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'dayIndex'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ADD COLUMN "dayIndex" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' 
        AND column_name = 'endTime'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ALTER COLUMN "endTime" DROP NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'employeeId'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ADD COLUMN "employeeId" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'employeeGroupId'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ADD COLUMN "employeeGroupId" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'functionId'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ADD COLUMN "functionId" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'departmentId'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ADD COLUMN "departmentId" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'categoryId'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ADD COLUMN "categoryId" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'note'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ADD COLUMN "note" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'breakMinutes'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ADD COLUMN "breakMinutes" INTEGER;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'breakPaid'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ADD COLUMN "breakPaid" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'shiftType'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" DROP COLUMN "shiftType";
    END IF;
END $$;
