-- CreateEnum for LogoPosition if not exists
DO $$ BEGIN
 CREATE TYPE "LogoPosition" AS ENUM ('TOP_LEFT', 'TOP_CENTER', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_CENTER', 'BOTTOM_RIGHT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add currency column to Business table if not exists
DO $$ BEGIN
 ALTER TABLE "Business" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

-- Add email column to Employee table if not exists
DO $$ BEGIN
 ALTER TABLE "Employee" ADD COLUMN "email" TEXT;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

-- Add unique constraint on email if not exists
DO $$ BEGIN
 ALTER TABLE "Employee" ADD CONSTRAINT "Employee_email_key" UNIQUE ("email");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;

-- CreateTable ContractTemplate if not exists
CREATE TABLE IF NOT EXISTS "ContractTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "logoPath" TEXT,
    "logoPosition" "LogoPosition" NOT NULL DEFAULT 'TOP_RIGHT',
    "businessId" TEXT NOT NULL,
    "employeeGroupId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable Contract if not exists
CREATE TABLE IF NOT EXISTS "Contract" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeGroupId" TEXT NOT NULL,
    "contractTemplateId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "contractPersonId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "signedStatus" TEXT DEFAULT 'UNSIGNED',
    "signatureData" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable PunchClockAccessSettings if not exists
CREATE TABLE IF NOT EXISTS "PunchClockAccessSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "allowPunchFromAnywhere" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PunchClockAccessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable AllowedLocation if not exists  
CREATE TABLE IF NOT EXISTS "AllowedLocation" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radius" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllowedLocation_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints if not exists

-- ContractTemplate foreign keys
DO $$ BEGIN
 ALTER TABLE "ContractTemplate" ADD CONSTRAINT "ContractTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ContractTemplate" ADD CONSTRAINT "ContractTemplate_employeeGroupId_fkey" FOREIGN KEY ("employeeGroupId") REFERENCES "EmployeeGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Contract foreign keys
DO $$ BEGIN
 ALTER TABLE "Contract" ADD CONSTRAINT "Contract_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Contract" ADD CONSTRAINT "Contract_employeeGroupId_fkey" FOREIGN KEY ("employeeGroupId") REFERENCES "EmployeeGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Contract" ADD CONSTRAINT "Contract_contractTemplateId_fkey" FOREIGN KEY ("contractTemplateId") REFERENCES "ContractTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Contract" ADD CONSTRAINT "Contract_contractPersonId_fkey" FOREIGN KEY ("contractPersonId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Contract" ADD CONSTRAINT "Contract_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- PunchClockAccessSettings foreign keys
DO $$ BEGIN
 ALTER TABLE "PunchClockAccessSettings" ADD CONSTRAINT "PunchClockAccessSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AllowedLocation foreign keys
DO $$ BEGIN
 ALTER TABLE "AllowedLocation" ADD CONSTRAINT "AllowedLocation_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "PunchClockAccessSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add unique indexes if not exists
DO $$ BEGIN
 CREATE UNIQUE INDEX "ContractTemplate_name_businessId_key" ON "ContractTemplate"("name", "businessId");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
 CREATE UNIQUE INDEX "PunchClockAccessSettings_businessId_key" ON "PunchClockAccessSettings"("businessId");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;
