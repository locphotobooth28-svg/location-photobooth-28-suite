ALTER TABLE "AppNotificationRead" ADD COLUMN "dismissedAt" TIMESTAMP(3);

CREATE TABLE "PushDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "receiptToken" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PushDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushDelivery_receiptToken_key" ON "PushDelivery"("receiptToken");
CREATE INDEX "PushDelivery_notificationId_idx" ON "PushDelivery"("notificationId");
CREATE INDEX "PushDelivery_userId_idx" ON "PushDelivery"("userId");
CREATE INDEX "PushDelivery_createdAt_idx" ON "PushDelivery"("createdAt");
