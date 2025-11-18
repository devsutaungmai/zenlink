/*
  Warnings:

  - You are about to drop the column `customer_id` on the `Department` table. All the data in the column will be lost.
  - You are about to drop the column `customer_id` on the `payment_terms` table. All the data in the column will be lost.
  - You are about to drop the column `days_until_due` on the `payment_terms` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `payment_terms` table. All the data in the column will be lost.
  - You are about to drop the column `term_name` on the `payment_terms` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[projectNumber]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `business_id` to the `payment_terms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `payment_terms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `payment_terms` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "payment_term_type" AS ENUM ('DAYS_AFTER', 'FIXED_DATE');

-- CreateEnum
CREATE TYPE "payment_time_unit" AS ENUM ('DAYS', 'MONTHS');

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_terms" DROP CONSTRAINT "payment_terms_customer_id_fkey";

-- DropIndex
DROP INDEX "payment_terms_customer_id_key";

-- AlterTable
ALTER TABLE "Department" DROP COLUMN "customer_id";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "projectNumber" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "payment_terms_id" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "payment_terms_id" TEXT;

-- AlterTable
ALTER TABLE "payment_terms" DROP COLUMN "customer_id",
DROP COLUMN "days_until_due",
DROP COLUMN "description",
DROP COLUMN "term_name",
ADD COLUMN     "business_id" TEXT NOT NULL,
ADD COLUMN     "daysUntil" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "timeUnit" "payment_time_unit",
ADD COLUMN     "type" "payment_term_type" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectNumber_key" ON "Project"("projectNumber");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_payment_terms_id_fkey" FOREIGN KEY ("payment_terms_id") REFERENCES "payment_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_terms_id_fkey" FOREIGN KEY ("payment_terms_id") REFERENCES "payment_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_terms" ADD CONSTRAINT "payment_terms_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
