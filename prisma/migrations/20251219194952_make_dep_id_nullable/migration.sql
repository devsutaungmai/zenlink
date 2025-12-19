-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_departmentId_fkey";

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "departmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
