-- LP28 v8.5.38 - Comptes utilisateurs + 2FA
-- Migration PostgreSQL additive : aucune suppression de table ni de données existantes.

-- 1) Evolution de la table User existante
ALTER TABLE "User"
    ALTER COLUMN "email" DROP NOT NULL,
    ADD COLUMN "phone" TEXT,
    ADD COLUMN "username" TEXT,
    ADD COLUMN "role" TEXT NOT NULL DEFAULT 'VIEWER',
    ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "permissions" JSONB,
    ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "totpSecret" TEXT,
    ADD COLUMN "recoveryCodes" JSONB,
    ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- 2) Contraintes uniques pour les nouveaux identifiants
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- 3) Invitations temporaires d'inscription
CREATE TABLE "UserInvitation" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "permissions" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetUserId" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserInvitation_tokenHash_key"
    ON "UserInvitation"("tokenHash");

ALTER TABLE "UserInvitation"
    ADD CONSTRAINT "UserInvitation_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Appareils de confiance (30 jours)
CREATE TABLE "TrustedDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrustedDevice_tokenHash_key"
    ON "TrustedDevice"("tokenHash");

ALTER TABLE "TrustedDevice"
    ADD CONSTRAINT "TrustedDevice_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
