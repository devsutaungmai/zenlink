-- AlterTable
ALTER TABLE "InvoiceFormSettings" ADD COLUMN     "showProject" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ScheduleTemplateShift" ALTER COLUMN "updatedAt" DROP DEFAULT;
