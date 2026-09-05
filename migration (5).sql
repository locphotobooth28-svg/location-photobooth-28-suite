ALTER TABLE "Event"
ALTER COLUMN "guestUploadModerated" SET DEFAULT FALSE;

UPDATE "Event"
SET "guestUploadModerated" = FALSE
WHERE "guestUploadModerated" = TRUE;
