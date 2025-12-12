-- CreateEnum (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScheduleTemplateLength') THEN
        CREATE TYPE "ScheduleTemplateLength" AS ENUM ('week', 'day');
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ScheduleTemplate' 
        AND column_name = 'length'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE "ScheduleTemplate" 
        ALTER COLUMN "length" TYPE "ScheduleTemplateLength" 
        USING "length"::"ScheduleTemplateLength";
    END IF;
END $$;
