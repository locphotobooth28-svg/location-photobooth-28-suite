-- LP28 v8.5.39 - Identité interne + liaison Compte / Collaborateur
-- Migration additive : aucune donnée événement/client/contrat n'est supprimée.

ALTER TABLE "User"
    ADD COLUMN "firstName" TEXT,
    ADD COLUMN "lastName" TEXT,
    ADD COLUMN "collaboratorId" TEXT;

ALTER TABLE "UserInvitation"
    ADD COLUMN "firstName" TEXT,
    ADD COLUMN "lastName" TEXT,
    ADD COLUMN "collaboratorId" TEXT;

CREATE UNIQUE INDEX "User_collaboratorId_key"
    ON "User"("collaboratorId");

ALTER TABLE "User"
    ADD CONSTRAINT "User_collaboratorId_fkey"
    FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Compatibilité du compte administrateur déjà existant :
-- le prénom est repris depuis le champ name lorsque firstName est vide.
UPDATE "User"
SET "firstName" = split_part(trim("name"), ' ', 1)
WHERE "firstName" IS NULL
  AND "name" IS NOT NULL
  AND trim("name") <> '';
