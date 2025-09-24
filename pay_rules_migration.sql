-- Create pay rules and overtime management system

-- Add new models to schema.prisma

-- Pay Codes/Salary Codes table
CREATE TABLE "SalaryCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL, -- 'HOURLY', 'SICK_PAY', 'OVERTIME', 'BONUS', 'DEDUCTION'
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryCode_pkey" PRIMARY KEY ("id")
);

-- Pay Rules table
CREATE TABLE "PayRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" TEXT NOT NULL, -- 'OVERTIME', 'SICK_PAY', 'REGULAR'
    "salaryCodeId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayRule_pkey" PRIMARY KEY ("id")
);

-- Overtime Rules table
CREATE TABLE "OvertimeRule" (
    "id" TEXT NOT NULL,
    "payRuleId" TEXT NOT NULL,
    "triggerAfterHours" DECIMAL(5,2) NOT NULL, -- X number of hours to trigger overtime
    "rateMultiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.5, -- Overtime rate multiplier (e.g., 1.5 for time and half)
    "isDaily" BOOLEAN NOT NULL DEFAULT true, -- true for daily overtime, false for weekly/period
    "maxHoursPerDay" DECIMAL(5,2), -- Optional max hours per day before different rate
    "maxHoursPerWeek" DECIMAL(5,2), -- Optional max hours per week before different rate
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OvertimeRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeGroupPayRule" (
    "id" TEXT NOT NULL,
    "employeeGroupId" TEXT NOT NULL,
    "payRuleId" TEXT NOT NULL,
    "baseRate" DECIMAL(10,2) NOT NULL
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeGroupPayRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeePayRule" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payRuleId" TEXT NOT NULL,
    "customRate" DECIMAL(10,2) NOT NULL, 
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePayRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SickPayCalculation" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "calculationDate" TIMESTAMP(3) NOT NULL,
    "threeMonthAverage" DECIMAL(10,2) NOT NULL,
    "basePeriodStart" TIMESTAMP(3) NOT NULL,
    "basePeriodEnd" TIMESTAMP(3) NOT NULL,
    "totalHours" DECIMAL(10,2) NOT NULL,
    "totalPay" DECIMAL(10,2) NOT NULL,
    "dailyRate" DECIMAL(10,2) NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SickPayCalculation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SalaryCode" ADD CONSTRAINT "SalaryCode_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PayRule" ADD CONSTRAINT "PayRule_salaryCodeId_fkey" FOREIGN KEY ("salaryCodeId") REFERENCES "SalaryCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayRule" ADD CONSTRAINT "PayRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OvertimeRule" ADD CONSTRAINT "OvertimeRule_payRuleId_fkey" FOREIGN KEY ("payRuleId") REFERENCES "PayRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeGroupPayRule" ADD CONSTRAINT "EmployeeGroupPayRule_employeeGroupId_fkey" FOREIGN KEY ("employeeGroupId") REFERENCES "EmployeeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeGroupPayRule" ADD CONSTRAINT "EmployeeGroupPayRule_payRuleId_fkey" FOREIGN KEY ("payRuleId") REFERENCES "PayRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeePayRule" ADD CONSTRAINT "EmployeePayRule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeePayRule" ADD CONSTRAINT "EmployeePayRule_payRuleId_fkey" FOREIGN KEY ("payRuleId") REFERENCES "PayRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SickPayCalculation" ADD CONSTRAINT "SickPayCalculation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SalaryCode_code_businessId_key" ON "SalaryCode"("code", "businessId");
CREATE UNIQUE INDEX "PayRule_name_businessId_key" ON "PayRule"("name", "businessId");
CREATE UNIQUE INDEX "OvertimeRule_payRuleId_key" ON "OvertimeRule"("payRuleId");
CREATE UNIQUE INDEX "EmployeeGroupPayRule_employeeGroupId_payRuleId_key" ON "EmployeeGroupPayRule"("employeeGroupId", "payRuleId");
CREATE UNIQUE INDEX "SickPayCalculation_employeeId_calculationDate_key" ON "SickPayCalculation"("employeeId", "calculationDate");

CREATE INDEX "PayRule_businessId_ruleType_idx" ON "PayRule"("businessId", "ruleType");
CREATE INDEX "EmployeePayRule_employeeId_isActive_idx" ON "EmployeePayRule"("employeeId", "isActive");
CREATE INDEX "SickPayCalculation_employeeId_calculationDate_idx" ON "SickPayCalculation"("employeeId", "calculationDate");

INSERT INTO "SalaryCode" ("id", "code", "name", "description", "category", "businessId", "createdAt", "updatedAt") 
SELECT 
    gen_random_uuid()::text,
    '120',
    'Hourly Wages',
    'Standard hourly wages for regular work',
    'HOURLY',
    b.id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Business" b;

INSERT INTO "SalaryCode" ("id", "code", "name", "description", "category", "businessId", "createdAt", "updatedAt") 
SELECT 
    gen_random_uuid()::text,
    '1203',
    'Sick Pay',
    'Sick pay based on average salary',
    'SICK_PAY',
    b.id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Business" b;

INSERT INTO "SalaryCode" ("id", "code", "name", "description", "category", "businessId", "createdAt", "updatedAt") 
SELECT 
    gen_random_uuid()::text,
    '1201',
    'Hourly Wage with Responsibility',
    'Hourly wage for supervisor shifts',
    'HOURLY',
    b.id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Business" b;

INSERT INTO "SalaryCode" ("id", "code", "name", "description", "category", "businessId", "createdAt", "updatedAt") 
SELECT 
    gen_random_uuid()::text,
    '121',
    'Overtime Pay',
    'Overtime pay at increased rate',
    'OVERTIME',
    b.id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Business" b;
