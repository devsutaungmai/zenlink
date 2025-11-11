-- CreateTable
CREATE TABLE "DepartmentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentFunction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeFunction" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeFunction_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "functionId" TEXT;

-- CreateIndex
CREATE INDEX "DepartmentCategory_departmentId_idx" ON "DepartmentCategory"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentCategory_name_departmentId_key" ON "DepartmentCategory"("name", "departmentId");

-- CreateIndex
CREATE INDEX "DepartmentFunction_categoryId_idx" ON "DepartmentFunction"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentFunction_name_categoryId_key" ON "DepartmentFunction"("name", "categoryId");

-- CreateIndex
CREATE INDEX "EmployeeFunction_employeeId_idx" ON "EmployeeFunction"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeFunction_functionId_idx" ON "EmployeeFunction"("functionId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeFunction_employeeId_functionId_key" ON "EmployeeFunction"("employeeId", "functionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Shift_functionId_idx" ON "Shift"("functionId");

-- AddForeignKey
ALTER TABLE "DepartmentCategory" ADD CONSTRAINT "DepartmentCategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentFunction" ADD CONSTRAINT "DepartmentFunction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DepartmentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeFunction" ADD CONSTRAINT "EmployeeFunction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeFunction" ADD CONSTRAINT "EmployeeFunction_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "DepartmentFunction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "DepartmentFunction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
