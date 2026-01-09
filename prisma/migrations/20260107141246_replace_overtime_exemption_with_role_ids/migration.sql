/*
  Warnings:

  - You are about to drop the column `overtimeExemption` on the `ContractType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ContractType" DROP COLUMN "overtimeExemption",
ADD COLUMN     "overtimeExemptRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
