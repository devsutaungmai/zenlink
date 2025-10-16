-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;
