/*
  Warnings:

  - Added the required column `sequence` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "sequence" INTEGER NOT NULL;
