-- Mathis SAV V3.1 : distinguer les informations N1 des demandes N2/N3
ALTER TABLE "MathisIncident" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 2;
