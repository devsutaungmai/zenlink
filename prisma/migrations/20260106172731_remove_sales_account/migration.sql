/*
  Warnings:

  - You are about to drop the column `sales_account_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `sales_accounts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_sales_account_id_fkey";

-- DropForeignKey
ALTER TABLE "sales_accounts" DROP CONSTRAINT "sales_accounts_ledger_account_id_fkey";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "sales_account_id",
ADD COLUMN     "ledger_account_id" TEXT;

-- DropTable
DROP TABLE "sales_accounts";

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
