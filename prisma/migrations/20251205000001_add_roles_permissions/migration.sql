-- Rename the old Role enum to LegacyUserRole (only if it's an ENUM type, not a table row type)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'Role' 
        AND t.typtype = 'e'  -- 'e' means enum type
        AND n.nspname = 'public'
    ) THEN
        ALTER TYPE "Role" RENAME TO "LegacyUserRole";
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Role_businessId_idx" ON "Role"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_businessId_key" ON "Role"("name", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- AlterTable - Add roleId column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roleId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_roleId_idx" ON "User"("roleId");

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_roleId_fkey') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Role_businessId_fkey') THEN
        ALTER TABLE "Role" ADD CONSTRAINT "Role_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RolePermission_roleId_fkey') THEN
        ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RolePermission_permissionId_fkey') THEN
        ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable LaborLawSettings (if not exists)
CREATE TABLE IF NOT EXISTS "LaborLawSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "maxHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 9,
    "maxHoursPerWeek" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "maxOvertimePerDay" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "maxOvertimePerWeek" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "maxConsecutiveDays" INTEGER NOT NULL DEFAULT 6,
    "minRestHoursBetweenShifts" DOUBLE PRECISION NOT NULL DEFAULT 11,
    "longShiftThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5.5,
    "minBreakForLongShifts" INTEGER NOT NULL DEFAULT 30,
    "overtimeThreshold" DOUBLE PRECISION NOT NULL DEFAULT 9,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaborLawSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LaborLawSettings_businessId_countryCode_key" ON "LaborLawSettings"("businessId", "countryCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LaborLawSettings_businessId_idx" ON "LaborLawSettings"("businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LaborLawSettings_businessId_isActive_idx" ON "LaborLawSettings"("businessId", "isActive");

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LaborLawSettings_businessId_fkey') THEN
        ALTER TABLE "LaborLawSettings" ADD CONSTRAINT "LaborLawSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable ScheduleTemplate (if not exists)
CREATE TABLE IF NOT EXISTS "ScheduleTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "length" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduleTemplate_businessId_idx" ON "ScheduleTemplate"("businessId");

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduleTemplate_businessId_fkey') THEN
        ALTER TABLE "ScheduleTemplate" ADD CONSTRAINT "ScheduleTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable ScheduleTemplateShift (if not exists)
CREATE TABLE IF NOT EXISTS "ScheduleTemplateShift" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "shiftType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleTemplateShift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduleTemplateShift_templateId_idx" ON "ScheduleTemplateShift"("templateId");

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduleTemplateShift_templateId_fkey') THEN
        ALTER TABLE "ScheduleTemplateShift" ADD CONSTRAINT "ScheduleTemplateShift_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ScheduleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable RoleDepartment (if not exists)
CREATE TABLE IF NOT EXISTS "RoleDepartment" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RoleDepartment_roleId_departmentId_key" ON "RoleDepartment"("roleId", "departmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RoleDepartment_roleId_idx" ON "RoleDepartment"("roleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RoleDepartment_departmentId_idx" ON "RoleDepartment"("departmentId");

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RoleDepartment_roleId_fkey') THEN
        ALTER TABLE "RoleDepartment" ADD CONSTRAINT "RoleDepartment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RoleDepartment_departmentId_fkey') THEN
        ALTER TABLE "RoleDepartment" ADD CONSTRAINT "RoleDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable EmployeeRole (if not exists)
CREATE TABLE IF NOT EXISTS "EmployeeRole" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeRole_employeeId_roleId_key" ON "EmployeeRole"("employeeId", "roleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeRole_employeeId_idx" ON "EmployeeRole"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeRole_roleId_idx" ON "EmployeeRole"("roleId");

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeRole_employeeId_fkey') THEN
        ALTER TABLE "EmployeeRole" ADD CONSTRAINT "EmployeeRole_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeRole_roleId_fkey') THEN
        ALTER TABLE "EmployeeRole" ADD CONSTRAINT "EmployeeRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
