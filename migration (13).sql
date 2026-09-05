CREATE TABLE "MathisIncident" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "portalRole" TEXT NOT NULL,
  "booth" TEXT,
  "printer" TEXT,
  "issue" TEXT,
  "diagnostic" TEXT,
  "led" TEXT,
  "contactFirstName" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL,
  "photosAvailable" BOOLEAN NOT NULL DEFAULT true,
  "printsAvailable" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "takenAt" TIMESTAMP(3),
  "level3At" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MathisIncident_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MathisIncident_eventId_idx" ON "MathisIncident"("eventId");
CREATE INDEX "MathisIncident_status_idx" ON "MathisIncident"("status");
CREATE INDEX "MathisIncident_createdAt_idx" ON "MathisIncident"("createdAt");
ALTER TABLE "MathisIncident" ADD CONSTRAINT "MathisIncident_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
