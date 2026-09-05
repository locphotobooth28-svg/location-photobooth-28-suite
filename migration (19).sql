CREATE TABLE "MaterialUnavailability" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialUnavailability_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MaterialUnavailability_materialId_idx"
ON "MaterialUnavailability"("materialId");

CREATE INDEX "MaterialUnavailability_startAt_endAt_idx"
ON "MaterialUnavailability"("startAt", "endAt");

ALTER TABLE "MaterialUnavailability"
ADD CONSTRAINT "MaterialUnavailability_materialId_fkey"
FOREIGN KEY ("materialId")
REFERENCES "Material"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
