# LP28 Suite 8.5.74 — dépôt nettoyé

Nettoyage effectué sans toucher au fonctionnement de l'application.

Supprimés de la racine :
- anciens fichiers de notes MATHIS_V*.md
- anciens fichiers LP28_V2_7 / LP28_V2_8
- App-changements-a-recuperer.patch
- testfile
- deux copies de migrations placées hors du dossier Prisma officiel

Conservés volontairement :
- README.md
- CHANGELOG.md
- contract-signature.sql et memory-drive.sql (scripts historiques utiles, non supprimés sans migration Prisma équivalente sûre)
- toutes les migrations sous prisma/migrations
- tous les fichiers applicatifs et assets

Prisma est configuré pour lire les migrations dans prisma/migrations uniquement.
