-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "customer_id" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "customer_id" TEXT;

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "customer_number" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "organization_number" TEXT,
    "address" TEXT,
    "postal_code" TEXT,
    "postal_address" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "discount_percentage" DECIMAL(5,2),
    "delivery_address" TEXT,
    "delivery_address_postal_code" TEXT,
    "delivery_address_postal_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_terms" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "term_name" TEXT NOT NULL,
    "days_until_due" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_persons" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_groups" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_number_key" ON "customers"("customer_number");

-- CreateIndex
CREATE UNIQUE INDEX "payment_terms_customer_id_key" ON "payment_terms"("customer_id");

-- CreateIndex
-- CREATE INDEX "Shift_date_idx" ON "Shift"("date");

-- CreateIndex
CREATE INDEX "Shift_employeeId_idx" ON "Shift"("employeeId");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_terms" ADD CONSTRAINT "payment_terms_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_persons" ADD CONSTRAINT "contact_persons_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_groups" ADD CONSTRAINT "customer_groups_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
