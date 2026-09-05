CREATE TABLE IF NOT EXISTS "MemoryMedia" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "mediaType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'VISIBLE',
  "uploadedBy" TEXT NOT NULL DEFAULT 'GUEST',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemoryMedia_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemoryMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MemoryMedia_eventId_status_idx" ON "MemoryMedia"("eventId", "status");
