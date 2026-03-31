DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'breakStart'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ADD COLUMN "breakStart" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ScheduleTemplateShift' AND column_name = 'breakEnd'
    ) THEN
        ALTER TABLE "ScheduleTemplateShift" ADD COLUMN "breakEnd" TEXT;
    END IF;
END $$;
