/*
  Warnings:

  - You are about to drop the column `vat_code` on the `ledger_accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ledger_accounts" DROP COLUMN "vat_code",
ADD COLUMN     "vat_code_id" TEXT;

-- CreateTable
CREATE TABLE "vat_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "offset_account_number" TEXT,
    "settlement_account_number" TEXT,
    "business_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vat_codes_code_business_id_key" ON "vat_codes"("code", "business_id");

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_vat_code_id_fkey" FOREIGN KEY ("vat_code_id") REFERENCES "vat_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_codes" ADD CONSTRAINT "vat_codes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
