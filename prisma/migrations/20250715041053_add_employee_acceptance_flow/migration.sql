-- AlterTable
ALTER TABLE "ShiftExchange" ADD COLUMN     "employeeResponseAt" TIMESTAMP(3),
ADD COLUMN     "employeeResponseBy" TEXT,
ALTER COLUMN "status" SET DEFAULT 'EMPLOYEE_PENDING';
