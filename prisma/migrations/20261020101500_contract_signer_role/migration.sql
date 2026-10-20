-- Enregistrement de la fonction du signataire indépendamment de l'organisateur
ALTER TABLE "Event" ADD COLUMN "contractSignerRole" TEXT;