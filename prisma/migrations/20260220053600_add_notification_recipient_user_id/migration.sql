-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "recipientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "recipientUserId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_isRead_idx" ON "Notification"("recipientUserId", "isRead");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
