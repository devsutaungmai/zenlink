-- CreateTable for EmployeeDepartment (many-to-many)
CREATE TABLE "EmployeeDepartment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable for EmployeeEmployeeGroup (many-to-many)
CREATE TABLE "EmployeeEmployeeGroup" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeGroupId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeEmployeeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDepartment_employeeId_departmentId_key" ON "EmployeeDepartment"("employeeId", "departmentId");

-- CreateIndex
CREATE INDEX "EmployeeDepartment_employeeId_idx" ON "EmployeeDepartment"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDepartment_departmentId_idx" ON "EmployeeDepartment"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeEmployeeGroup_employeeId_employeeGroupId_key" ON "EmployeeEmployeeGroup"("employeeId", "employeeGroupId");

-- CreateIndex
CREATE INDEX "EmployeeEmployeeGroup_employeeId_idx" ON "EmployeeEmployeeGroup"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeEmployeeGroup_employeeGroupId_idx" ON "EmployeeEmployeeGroup"("employeeGroupId");

-- AddForeignKey
ALTER TABLE "EmployeeDepartment" ADD CONSTRAINT "EmployeeDepartment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDepartment" ADD CONSTRAINT "EmployeeDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEmployeeGroup" ADD CONSTRAINT "EmployeeEmployeeGroup_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeEmployeeGroup" ADD CONSTRAINT "EmployeeEmployeeGroup_employeeGroupId_fkey" FOREIGN KEY ("employeeGroupId") REFERENCES "EmployeeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data
-- Copy existing departmentId to EmployeeDepartment as primary
INSERT INTO "EmployeeDepartment" ("id", "employeeId", "departmentId", "isPrimary", "createdAt")
SELECT gen_random_uuid(), "id", "departmentId", true, CURRENT_TIMESTAMP
FROM "Employee"
WHERE "departmentId" IS NOT NULL;

-- Copy existing employeeGroupId to EmployeeEmployeeGroup as primary
INSERT INTO "EmployeeEmployeeGroup" ("id", "employeeId", "employeeGroupId", "isPrimary", "createdAt")
SELECT gen_random_uuid(), "id", "employeeGroupId", true, CURRENT_TIMESTAMP
FROM "Employee"
WHERE "employeeGroupId" IS NOT NULL;
