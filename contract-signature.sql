ALTER TABLE "Event"
ADD COLUMN "contractDocumentHash" TEXT,
ADD COLUMN "contractGeneratedAt" TIMESTAMP(3),
ADD COLUMN "contractSignatureData" TEXT,
ADD COLUMN "contractSignedAt" TIMESTAMP(3),
ADD COLUMN "contractSignerEmail" TEXT,
ADD COLUMN "contractSignerName" TEXT,
ADD COLUMN "contractStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
ADD COLUMN "contractToken" TEXT;

CREATE UNIQUE INDEX "Event_contractToken_key"
ON "Event"("contractToken");
