ALTER TABLE "MemoryMedia"
ADD COLUMN "driveFileId" TEXT,
ADD COLUMN "driveUrl" TEXT,
ADD COLUMN "storageType" TEXT NOT NULL DEFAULT 'LOCAL';

CREATE INDEX "MemoryMedia_driveFileId_idx"
ON "MemoryMedia"("driveFileId");
