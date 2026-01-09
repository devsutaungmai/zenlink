-- CreateTable
CREATE TABLE "invoice_general_settings" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "first_invoice_number" INTEGER NOT NULL DEFAULT 1,
    "first_credit_note_number" INTEGER NOT NULL DEFAULT 1,
    "customer_number_series_start" INTEGER,
    "customer_number_series_end" INTEGER,
    "next_customer_number" INTEGER,
    "default_bank_account" TEXT,
    "default_payment_terms_days" INTEGER DEFAULT 30,
    "default_due_days" INTEGER DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_general_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_general_settings_business_id_key" ON "invoice_general_settings"("business_id");

-- AddForeignKey
ALTER TABLE "invoice_general_settings" ADD CONSTRAINT "invoice_general_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
