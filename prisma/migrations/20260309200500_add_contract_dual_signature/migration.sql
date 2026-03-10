-- AlterTable: Add dual signature fields to Contract
ALTER TABLE "Contract" ADD COLUMN "adminSignatureData" TEXT;
ALTER TABLE "Contract" ADD COLUMN "adminSignedAt" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN "adminSignedById" TEXT;
ALTER TABLE "Contract" ADD COLUMN "employeeSignatureData" TEXT;
ALTER TABLE "Contract" ADD COLUMN "employeeSignedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Contract_adminSignedById_idx" ON "Contract"("adminSignedById");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_adminSignedById_fkey" FOREIGN KEY ("adminSignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add contractId to Notification
ALTER TABLE "Notification" ADD COLUMN "contractId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_contractId_idx" ON "Notification"("contractId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterEnum: Add contract notification types
ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_PENDING_SIGNATURE';
ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_SIGNED';
