/*
  Warnings:

  - A unique constraint covering the columns `[account_number,business_id]` on the table `ledger_accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ledger_accounts_account_number_key";

-- AlterTable
ALTER TABLE "ledger_accounts" ADD COLUMN     "allow_department" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allow_project" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "industry_specification" TEXT,
ADD COLUMN     "report_group" TEXT,
ADD COLUMN     "require_department" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "require_project" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "saft_standard_account" TEXT,
ADD COLUMN     "vat_code" TEXT,
ADD COLUMN     "vat_specification" TEXT,
ALTER COLUMN "business_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_account_number_business_id_key" ON "ledger_accounts"("account_number", "business_id");
