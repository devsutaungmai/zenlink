-- CreateEnum
CREATE TYPE "IncompleteProfileBehavior" AS ENUM ('SHOW_WARNING', 'BLOCK_SCHEDULING', 'NONE');

-- CreateTable
CREATE TABLE "EmployeeSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "requireFirstName" BOOLEAN NOT NULL DEFAULT true,
    "requireLastName" BOOLEAN NOT NULL DEFAULT true,
    "requireBirthday" BOOLEAN NOT NULL DEFAULT true,
    "requireGender" BOOLEAN NOT NULL DEFAULT true,
    "requireAddress" BOOLEAN NOT NULL DEFAULT false,
    "requirePhone" BOOLEAN NOT NULL DEFAULT true,
    "requireEmail" BOOLEAN NOT NULL DEFAULT false,
    "requireSocialSecurityNo" BOOLEAN NOT NULL DEFAULT false,
    "requireEmployeeNo" BOOLEAN NOT NULL DEFAULT true,
    "requireDateOfHire" BOOLEAN NOT NULL DEFAULT true,
    "requireHoursPerMonth" BOOLEAN NOT NULL DEFAULT true,
    "requireBankAccount" BOOLEAN NOT NULL DEFAULT false,
    "requireDepartment" BOOLEAN NOT NULL DEFAULT true,
    "requireSalaryRate" BOOLEAN NOT NULL DEFAULT false,
    "incompleteProfileBehavior" "IncompleteProfileBehavior" NOT NULL DEFAULT 'SHOW_WARNING',
    "defaultDepartmentId" TEXT,
    "defaultEmployeeGroupId" TEXT,
    "defaultRoleId" TEXT,
    "rolesCanViewEmployees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "employeesCanSeeContactInfo" BOOLEAN NOT NULL DEFAULT true,
    "limitVisibilityByDepartment" BOOLEAN NOT NULL DEFAULT false,
    "onboardingRequiredFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requireManagerApproval" BOOLEAN NOT NULL DEFAULT false,
    "sendMissingInfoReminder" BOOLEAN NOT NULL DEFAULT true,
    "reminderDaysAfterHire" INTEGER NOT NULL DEFAULT 7,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "employeeNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "employeesCanEditProfile" BOOLEAN NOT NULL DEFAULT true,
    "employeeEditableFields" TEXT[] DEFAULT ARRAY['phone', 'address', 'profilePhoto']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSettings_businessId_key" ON "EmployeeSettings"("businessId");

-- CreateIndex
CREATE INDEX "EmployeeSettings_businessId_idx" ON "EmployeeSettings"("businessId");

-- AddForeignKey
ALTER TABLE "EmployeeSettings" ADD CONSTRAINT "EmployeeSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
