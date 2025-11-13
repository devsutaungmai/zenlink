CREATE INDEX IF NOT EXISTS "Shift_date_idx" ON "Shift"("date");
CREATE INDEX IF NOT EXISTS "Shift_employeeId_idx" ON "Shift"("employeeId");

CREATE TABLE "CategoryDepartment" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryDepartment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CategoryDepartment_categoryId_idx" ON "CategoryDepartment"("categoryId");

CREATE INDEX "CategoryDepartment_departmentId_idx" ON "CategoryDepartment"("departmentId");

CREATE UNIQUE INDEX "CategoryDepartment_categoryId_departmentId_key" ON "CategoryDepartment"("categoryId", "departmentId");

ALTER TABLE "CategoryDepartment" ADD CONSTRAINT "CategoryDepartment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DepartmentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CategoryDepartment" ADD CONSTRAINT "CategoryDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CategoryDepartment" ("id", "categoryId", "departmentId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    "id" as "categoryId",
    "departmentId",
    CURRENT_TIMESTAMP
FROM "DepartmentCategory"
WHERE "departmentId" IS NOT NULL
ON CONFLICT ("categoryId", "departmentId") DO NOTHING;
