-- AlterTable
ALTER TABLE "Business" ADD COLUMN "organizationNumber" TEXT;
ALTER TABLE "Business" ADD COLUMN "phone" TEXT;
ALTER TABLE "Business" ADD COLUMN "email" TEXT;
ALTER TABLE "Business" ADD COLUMN "website" TEXT;
ALTER TABLE "Business" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Business" ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false;
