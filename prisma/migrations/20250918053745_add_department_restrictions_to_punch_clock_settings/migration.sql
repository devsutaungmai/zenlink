-- AlterTable
ALTER TABLE "PunchClockAccessSettings" ADD COLUMN     "allowedDepartments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "restrictByDepartment" BOOLEAN NOT NULL DEFAULT false;
