ALTER TABLE "Material"
ADD COLUMN IF NOT EXISTS "capacity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "blocksPlanning" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "bookingVisible" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "resourceKind" TEXT NOT NULL DEFAULT 'SHARED';

ALTER TABLE "EventMaterial"
ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "Printer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "loadedCapacity" INTEGER NOT NULL DEFAULT 0,
  "remainingPrints" INTEGER NOT NULL DEFAULT 0,
  "warningAt" INTEGER NOT NULL DEFAULT 100,
  "totalPrints" INTEGER NOT NULL DEFAULT 0,
  "lastReloadAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Printer_name_key" ON "Printer"("name");

CREATE TABLE IF NOT EXISTS "PrinterPaperMovement" (
  "id" TEXT NOT NULL,
  "printerId" TEXT NOT NULL,
  "eventId" TEXT,
  "quantity" INTEGER NOT NULL,
  "movementType" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrinterPaperMovement_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='Event' AND column_name='printerId'
  ) THEN
    ALTER TABLE "Event" ADD COLUMN "printerId" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='Event_printerId_fkey'
  ) THEN
    ALTER TABLE "Event"
    ADD CONSTRAINT "Event_printerId_fkey"
    FOREIGN KEY ("printerId") REFERENCES "Printer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='PrinterPaperMovement_printerId_fkey'
  ) THEN
    ALTER TABLE "PrinterPaperMovement"
    ADD CONSTRAINT "PrinterPaperMovement_printerId_fkey"
    FOREIGN KEY ("printerId") REFERENCES "Printer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
