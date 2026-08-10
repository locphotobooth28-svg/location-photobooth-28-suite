CREATE TABLE "Collaborator" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "canInstall" BOOLEAN NOT NULL DEFAULT true,
  "canPickup" BOOLEAN NOT NULL DEFAULT true,
  "canManage" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Collaborator_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Event"
ADD COLUMN "responsibleCollaboratorId" TEXT,
ADD COLUMN "installerCollaboratorId" TEXT,
ADD COLUMN "pickupCollaboratorId" TEXT;

ALTER TABLE "Event"
ADD CONSTRAINT "Event_responsibleCollaboratorId_fkey"
FOREIGN KEY ("responsibleCollaboratorId")
REFERENCES "Collaborator"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "Event"
ADD CONSTRAINT "Event_installerCollaboratorId_fkey"
FOREIGN KEY ("installerCollaboratorId")
REFERENCES "Collaborator"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "Event"
ADD CONSTRAINT "Event_pickupCollaboratorId_fkey"
FOREIGN KEY ("pickupCollaboratorId")
REFERENCES "Collaborator"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Event_responsibleCollaboratorId_idx"
ON "Event"("responsibleCollaboratorId");

CREATE INDEX "Event_installerCollaboratorId_idx"
ON "Event"("installerCollaboratorId");

CREATE INDEX "Event_pickupCollaboratorId_idx"
ON "Event"("pickupCollaboratorId");
