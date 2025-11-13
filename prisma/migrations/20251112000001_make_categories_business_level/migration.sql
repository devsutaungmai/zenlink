-- AlterTable: Make categories business-level instead of department-level
-- Add businessId column to DepartmentCategory
ALTER TABLE "DepartmentCategory" ADD COLUMN "businessId" TEXT;

-- Populate businessId from existing departmentId relationship
UPDATE "DepartmentCategory" AS dc
SET "businessId" = d."businessId"
FROM "Department" AS d
WHERE dc."departmentId" = d.id;

ALTER TABLE "DepartmentCategory" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "DepartmentCategory" 
ADD CONSTRAINT "DepartmentCategory_businessId_fkey" 
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DepartmentCategory" DROP CONSTRAINT IF EXISTS "DepartmentCategory_name_departmentId_key";

ALTER TABLE "DepartmentCategory" ADD CONSTRAINT "DepartmentCategory_name_businessId_key" UNIQUE ("name", "businessId");

ALTER TABLE "DepartmentCategory" ALTER COLUMN "departmentId" DROP NOT NULL;

ALTER TABLE "DepartmentCategory" DROP CONSTRAINT IF EXISTS "DepartmentCategory_departmentId_fkey";
ALTER TABLE "DepartmentCategory" 
ADD CONSTRAINT "DepartmentCategory_departmentId_fkey" 
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DepartmentCategory_businessId_idx" ON "DepartmentCategory"("businessId");
