CREATE TABLE IF NOT EXISTS "GoogleConnection" (
    "id" TEXT NOT NULL DEFAULT 'primary',
    "tokenEncrypted" TEXT NOT NULL,
    "googleEmail" TEXT,
    "scopes" TEXT,
    "driveRootFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoogleConnection_pkey" PRIMARY KEY ("id")
);
