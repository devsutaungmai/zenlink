-- AlterTable
ALTER TABLE "invoice_general_settings" ADD COLUMN     "next_product_number" INTEGER,
ADD COLUMN     "next_project_number" INTEGER,
ADD COLUMN     "product_number_series_end" INTEGER DEFAULT 9999,
ADD COLUMN     "product_number_series_start" INTEGER DEFAULT 1000,
ADD COLUMN     "project_number_series_end" INTEGER DEFAULT 9999,
ADD COLUMN     "project_number_series_start" INTEGER DEFAULT 1000;
