CREATE TABLE "CollaboratorAccess" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "collaboratorId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "canSeeClient" BOOLEAN NOT NULL DEFAULT true,
  "canSeeContract" BOOLEAN NOT NULL DEFAULT true,
  "canSeeInvoice" BOOLEAN NOT NULL DEFAULT false,
  "canSeeBalance" BOOLEAN NOT NULL DEFAULT true,
  "canManageCaution" BOOLEAN NOT NULL DEFAULT true,
  "canSeeInstructions" BOOLEAN NOT NULL DEFAULT true,
  "missionNotes" TEXT,
  "collaboratorReport" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CollaboratorAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollaboratorAccess_token_key"
ON "CollaboratorAccess"("token");

CREATE UNIQUE INDEX "CollaboratorAccess_eventId_collaboratorId_key"
ON "CollaboratorAccess"("eventId", "collaboratorId");

CREATE INDEX "CollaboratorAccess_eventId_idx"
ON "CollaboratorAccess"("eventId");

CREATE INDEX "CollaboratorAccess_collaboratorId_idx"
ON "CollaboratorAccess"("collaboratorId");

ALTER TABLE "CollaboratorAccess"
ADD CONSTRAINT "CollaboratorAccess_eventId_fkey"
FOREIGN KEY ("eventId")
REFERENCES "Event"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "CollaboratorAccess"
ADD CONSTRAINT "CollaboratorAccess_collaboratorId_fkey"
FOREIGN KEY ("collaboratorId")
REFERENCES "Collaborator"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
