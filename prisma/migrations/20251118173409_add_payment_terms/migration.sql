/*
  Warnings:

  - You are about to drop the column `customer_id` on the `Department` table. All the data in the column will be lost.
  - You are about to drop the `payment_terms` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[projectNumber]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "invoice_due_date_type" AS ENUM ('DAYS_AFTER', 'FIXED_DATE');

-- CreateEnum
CREATE TYPE "payment_time_unit" AS ENUM ('DAYS', 'MONTHS');

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_terms" DROP CONSTRAINT "payment_terms_customer_id_fkey";

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
ADD COLUMN     "invoice_payment_terms_id" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "invoice_payment_terms_id" TEXT;

-- DropTable
DROP TABLE "payment_terms";

-- CreateTable
CREATE TABLE "invoice_payment_terms" (
    "id" TEXT NOT NULL,
    "invoice_due_date_type" "invoice_due_date_type" NOT NULL DEFAULT 'DAYS_AFTER',
    "invoice_due_date_value" INTEGER NOT NULL DEFAULT 14,
    "invoice_due_date_unit" "payment_time_unit" NOT NULL DEFAULT 'DAYS',
    "default_discount_percent" DECIMAL(5,2) DEFAULT 0,
    "business_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_payment_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectNumber_key" ON "Project"("projectNumber");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_invoice_payment_terms_id_fkey" FOREIGN KEY ("invoice_payment_terms_id") REFERENCES "invoice_payment_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_invoice_payment_terms_id_fkey" FOREIGN KEY ("invoice_payment_terms_id") REFERENCES "invoice_payment_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payment_terms" ADD CONSTRAINT "invoice_payment_terms_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
