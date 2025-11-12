/*
  Warnings:

  - Added the required column `businessId` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `businessId` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "businessId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "businessId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
