ALTER TABLE "ScheduleTemplateShift"
ADD COLUMN "shiftTypeId" TEXT,
ADD COLUMN "wage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "wageType" "WageType" NOT NULL DEFAULT 'HOURLY';

CREATE INDEX "ScheduleTemplateShift_shiftTypeId_idx" ON "ScheduleTemplateShift"("shiftTypeId");

ALTER TABLE "ScheduleTemplateShift"
ADD CONSTRAINT "ScheduleTemplateShift_shiftTypeId_fkey"
FOREIGN KEY ("shiftTypeId") REFERENCES "ShiftTypeConfig"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
