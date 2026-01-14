-- DropForeignKey
ALTER TABLE "PunchClockProfile" DROP CONSTRAINT "PunchClockProfile_departmentId_fkey";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "punchClockProfileId" TEXT;

-- AlterTable
ALTER TABLE "PunchClockProfile" ALTER COLUMN "departmentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PunchClockProfileDepartment" (
    "id" TEXT NOT NULL,
    "punchClockProfileId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PunchClockProfileDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PunchClockProfileDepartment_punchClockProfileId_idx" ON "PunchClockProfileDepartment"("punchClockProfileId");

-- CreateIndex
CREATE INDEX "PunchClockProfileDepartment_departmentId_idx" ON "PunchClockProfileDepartment"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PunchClockProfileDepartment_punchClockProfileId_departmentI_key" ON "PunchClockProfileDepartment"("punchClockProfileId", "departmentId");

-- CreateIndex
CREATE INDEX "Attendance_punchClockProfileId_idx" ON "Attendance"("punchClockProfileId");

-- AddForeignKey
ALTER TABLE "PunchClockProfile" ADD CONSTRAINT "PunchClockProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchClockProfileDepartment" ADD CONSTRAINT "PunchClockProfileDepartment_punchClockProfileId_fkey" FOREIGN KEY ("punchClockProfileId") REFERENCES "PunchClockProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchClockProfileDepartment" ADD CONSTRAINT "PunchClockProfileDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_punchClockProfileId_fkey" FOREIGN KEY ("punchClockProfileId") REFERENCES "PunchClockProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
