-- AlterTable
ALTER TABLE "AllowedLocation" ADD COLUMN     "departmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
