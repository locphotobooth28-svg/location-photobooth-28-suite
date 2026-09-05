ALTER TABLE "Event"
ADD COLUMN IF NOT EXISTS "googleCalendarId" TEXT;

CREATE TABLE IF NOT EXISTS "GoogleConnection" (
  "id" TEXT NOT NULL DEFAULT 'primary',
  "tokenEncrypted" TEXT NOT NULL,
  "googleEmail" TEXT,
  "scopes" TEXT,
  "driveRootFolderId" TEXT,
  "defaultCalendarId" TEXT,
  "defaultCalendarSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoogleConnection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GoogleConnection"
ADD COLUMN IF NOT EXISTS "defaultCalendarId" TEXT,
ADD COLUMN IF NOT EXISTS "defaultCalendarSummary" TEXT;
