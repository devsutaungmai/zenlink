-- CreateTable
CREATE TABLE "business_ledger_account_vat_codes" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "ledger_account_id" TEXT NOT NULL,
    "vat_code_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_ledger_account_vat_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_ledger_account_vat_codes_business_id_ledger_accoun_key" ON "business_ledger_account_vat_codes"("business_id", "ledger_account_id");

-- AddForeignKey
ALTER TABLE "business_ledger_account_vat_codes" ADD CONSTRAINT "business_ledger_account_vat_codes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_ledger_account_vat_codes" ADD CONSTRAINT "business_ledger_account_vat_codes_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_ledger_account_vat_codes" ADD CONSTRAINT "business_ledger_account_vat_codes_vat_code_id_fkey" FOREIGN KEY ("vat_code_id") REFERENCES "vat_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
