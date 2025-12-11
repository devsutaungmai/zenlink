-- AlterTable
ALTER TABLE "_DepartmentFunctionToEmployeeGroup" ADD CONSTRAINT "_DepartmentFunctionToEmployeeGroup_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_DepartmentFunctionToEmployeeGroup_AB_unique";
