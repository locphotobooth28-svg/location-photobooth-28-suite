ALTER TABLE "Event"
ADD COLUMN IF NOT EXISTS "googleCalendarId" TEXT;

ALTER TABLE "GoogleConnection"
ADD COLUMN IF NOT EXISTS "defaultCalendarId" TEXT,
ADD COLUMN IF NOT EXISTS "defaultCalendarSummary" TEXT;
