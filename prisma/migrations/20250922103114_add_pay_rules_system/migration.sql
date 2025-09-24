-- AlterTable
ALTER TABLE "EmployeeGroup" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "SalaryCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" TEXT NOT NULL,
    "salaryCodeId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvertimeRule" (
    "id" TEXT NOT NULL,
    "payRuleId" TEXT NOT NULL,
    "triggerAfterHours" DECIMAL(5,2) NOT NULL,
    "rateMultiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    "isDaily" BOOLEAN NOT NULL DEFAULT true,
    "maxHoursPerDay" DECIMAL(5,2),
    "maxHoursPerWeek" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OvertimeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeGroupPayRule" (
    "id" TEXT NOT NULL,
    "employeeGroupId" TEXT NOT NULL,
    "payRuleId" TEXT NOT NULL,
    "baseRate" DECIMAL(10,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeGroupPayRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "SalaryCode_code_businessId_key" ON "SalaryCode"("code", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PayRule_name_businessId_key" ON "PayRule"("name", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "OvertimeRule_payRuleId_key" ON "OvertimeRule"("payRuleId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeGroupPayRule_employeeGroupId_payRuleId_key" ON "EmployeeGroupPayRule"("employeeGroupId", "payRuleId");

-- CreateIndex
CREATE INDEX "EmployeePayRule_employeeId_isActive_idx" ON "EmployeePayRule"("employeeId", "isActive");

-- CreateIndex
CREATE INDEX "SickPayCalculation_employeeId_calculationDate_idx" ON "SickPayCalculation"("employeeId", "calculationDate");

-- CreateIndex
CREATE UNIQUE INDEX "SickPayCalculation_employeeId_calculationDate_key" ON "SickPayCalculation"("employeeId", "calculationDate");

-- AddForeignKey
ALTER TABLE "SalaryCode" ADD CONSTRAINT "SalaryCode_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayRule" ADD CONSTRAINT "PayRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayRule" ADD CONSTRAINT "PayRule_salaryCodeId_fkey" FOREIGN KEY ("salaryCodeId") REFERENCES "SalaryCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRule" ADD CONSTRAINT "OvertimeRule_payRuleId_fkey" FOREIGN KEY ("payRuleId") REFERENCES "PayRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGroupPayRule" ADD CONSTRAINT "EmployeeGroupPayRule_employeeGroupId_fkey" FOREIGN KEY ("employeeGroupId") REFERENCES "EmployeeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGroupPayRule" ADD CONSTRAINT "EmployeeGroupPayRule_payRuleId_fkey" FOREIGN KEY ("payRuleId") REFERENCES "PayRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayRule" ADD CONSTRAINT "EmployeePayRule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayRule" ADD CONSTRAINT "EmployeePayRule_payRuleId_fkey" FOREIGN KEY ("payRuleId") REFERENCES "PayRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SickPayCalculation" ADD CONSTRAINT "SickPayCalculation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
