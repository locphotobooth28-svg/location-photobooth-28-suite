DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingStatus') THEN
    CREATE TYPE "BookingStatus" AS ENUM (
      'QUOTE_DRAFT',
      'QUOTE_SENT',
      'OPTION',
      'CONFIRMED',
      'CANCELLED',
      'DECLINED',
      'COMPLETED'
    );
  END IF;
END $$;

ALTER TABLE "Event"
ADD COLUMN IF NOT EXISTS "bookingStatus" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN IF NOT EXISTS "optionUntil" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "sceneJets" JSONB;
