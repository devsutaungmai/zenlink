-- Add function linkage to employee groups
ALTER TABLE "EmployeeGroup"
ADD COLUMN "functionId" TEXT;

ALTER TABLE "EmployeeGroup"
ADD CONSTRAINT "EmployeeGroup_functionId_fkey"
FOREIGN KEY ("functionId") REFERENCES "DepartmentFunction"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "EmployeeGroup_functionId_idx" ON "EmployeeGroup"("functionId");
