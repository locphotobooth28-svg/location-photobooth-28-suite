-- LP28 guest gallery permissions
-- Safe additive migration: no existing rows are deleted or rewritten.
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "guestDownloadEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "guestDeleteEnabled" BOOLEAN NOT NULL DEFAULT false;
