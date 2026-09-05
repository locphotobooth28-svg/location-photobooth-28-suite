CREATE TABLE "CollaboratorAction" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "collaboratorId" TEXT,
  "action" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CollaboratorAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollaboratorAction_eventId_idx"
ON "CollaboratorAction"("eventId");

CREATE INDEX "CollaboratorAction_collaboratorId_idx"
ON "CollaboratorAction"("collaboratorId");

CREATE INDEX "CollaboratorAction_eventId_action_idx"
ON "CollaboratorAction"("eventId", "action");

ALTER TABLE "CollaboratorAction"
ADD CONSTRAINT "CollaboratorAction_eventId_fkey"
FOREIGN KEY ("eventId")
REFERENCES "Event"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "CollaboratorAction"
ADD CONSTRAINT "CollaboratorAction_collaboratorId_fkey"
FOREIGN KEY ("collaboratorId")
REFERENCES "Collaborator"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
