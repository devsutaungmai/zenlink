/*
  Warnings:

  - Added the required column `sequence` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequence` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "sequence" INTEGER NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "sequence" INTEGER NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL;
