CREATE TABLE "MathisIncidentPhoto" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "driveFileId" TEXT NOT NULL,
  "driveUrl" TEXT,
  "controlType" TEXT,
  "booth" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MathisIncidentPhoto_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MathisIncidentPhoto_incidentId_idx" ON "MathisIncidentPhoto"("incidentId");
CREATE INDEX "MathisIncidentPhoto_eventId_idx" ON "MathisIncidentPhoto"("eventId");
CREATE INDEX "MathisIncidentPhoto_createdAt_idx" ON "MathisIncidentPhoto"("createdAt");
ALTER TABLE "MathisIncidentPhoto" ADD CONSTRAINT "MathisIncidentPhoto_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "MathisIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MathisIncidentPhoto" ADD CONSTRAINT "MathisIncidentPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
