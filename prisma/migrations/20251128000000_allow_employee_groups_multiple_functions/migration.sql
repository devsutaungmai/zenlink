-- Allow employee groups to link with multiple functions
CREATE TABLE IF NOT EXISTS "_DepartmentFunctionToEmployeeGroup" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

-- Ensure unique pairs and fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS "_DepartmentFunctionToEmployeeGroup_AB_unique" ON "_DepartmentFunctionToEmployeeGroup"("A", "B");
CREATE INDEX IF NOT EXISTS "_DepartmentFunctionToEmployeeGroup_B_index" ON "_DepartmentFunctionToEmployeeGroup"("B");

-- Enforce referential integrity
ALTER TABLE "_DepartmentFunctionToEmployeeGroup"
  ADD CONSTRAINT "_DepartmentFunctionToEmployeeGroup_A_fkey"
  FOREIGN KEY ("A") REFERENCES "DepartmentFunction"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_DepartmentFunctionToEmployeeGroup"
  ADD CONSTRAINT "_DepartmentFunctionToEmployeeGroup_B_fkey"
  FOREIGN KEY ("B") REFERENCES "EmployeeGroup"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single function assignments into the junction table
INSERT INTO "_DepartmentFunctionToEmployeeGroup" ("A", "B")
SELECT DISTINCT "functionId", "id"
FROM "EmployeeGroup"
WHERE "functionId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop old foreign key and column
ALTER TABLE "EmployeeGroup" DROP CONSTRAINT IF EXISTS "EmployeeGroup_functionId_fkey";
DROP INDEX IF EXISTS "EmployeeGroup_functionId_idx";
ALTER TABLE "EmployeeGroup" DROP COLUMN IF EXISTS "functionId";
