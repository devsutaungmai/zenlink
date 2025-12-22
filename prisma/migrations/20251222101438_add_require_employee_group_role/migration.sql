-- AlterTable
ALTER TABLE "EmployeeSettings" ADD COLUMN     "requireEmployeeGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireRole" BOOLEAN NOT NULL DEFAULT false;
