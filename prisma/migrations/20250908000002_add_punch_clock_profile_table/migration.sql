-- CreateTable PunchClockProfile if not exists
CREATE TABLE IF NOT EXISTS "PunchClockProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,
    "activationCode" TEXT,

    CONSTRAINT "PunchClockProfile_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints if not exists
DO $$ BEGIN
 ALTER TABLE "PunchClockProfile" ADD CONSTRAINT "PunchClockProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "PunchClockProfile" ADD CONSTRAINT "PunchClockProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add unique constraint if not exists
DO $$ BEGIN
 CREATE UNIQUE INDEX "PunchClockProfile_name_businessId_key" ON "PunchClockProfile"("name", "businessId");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;
