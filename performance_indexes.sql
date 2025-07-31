-- Add performance indexes for common queries
-- This will speed up employee, department, and employee group queries

-- Index for employee queries by business
CREATE INDEX IF NOT EXISTS idx_employee_business_created ON "Employee" USING btree ("createdAt" DESC) WHERE "userId" IN (SELECT "id" FROM "User");

-- Index for department queries by business  
CREATE INDEX IF NOT EXISTS idx_department_business_name ON "Department" USING btree ("businessId", "name");

-- Index for employee group queries by business
CREATE INDEX IF NOT EXISTS idx_employee_group_business_name ON "EmployeeGroup" USING btree ("businessId", "name");

-- Index for user business lookups
CREATE INDEX IF NOT EXISTS idx_user_business ON "User" USING btree ("businessId");

-- Index for employee number generation
CREATE INDEX IF NOT EXISTS idx_employee_no ON "Employee" USING btree ("employeeNo" DESC NULLS LAST);
