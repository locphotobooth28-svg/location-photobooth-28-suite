# LP28 Suite — Changelog

## 8.5.76 — Correctif Prisma / stabilité Mathis SAV
- Force la génération du client Prisma depuis `prisma/schema.prisma` avant chaque démarrage.
- Empêche `/api/admin/mathis/incidents` de faire tomber le serveur si la relation `photos` n’est pas encore disponible dans un client Prisma en cache.
- Chargement des photos SAV séparé et rétrocompatible.
- L’upload photo renvoie une erreur JSON propre si le modèle Prisma SAV n’est momentanément pas disponible, sans faire planter le service.
- Conserve les corrections de contraste et les photos SAV introduites en 8.5.75.

## 8.5.74
- Harmonisation visuelle de la fiche événement.
- Carte Paiement et caution uniformisée.
- Logo HD fourni par Johan intégré à LP28.

# Changelog

## 8.3.0 — Galeries Admin
- Nouveau menu administrateur `📸 Galeries`.
- Vue de toutes les galeries LP28 Memories actives.
- Compteurs photos, vidéos et médias masqués.
- Ouverture de chaque galerie depuis l'administration.
- Filtres : tout, visibles, masquées, en attente.
- Vue plein écran.
- Masquer / réafficher depuis l'administration.
- Suppression définitive protégée par `DELETE`.
- Accès rapide aux portails organisateur et invité.
- Accès FotoShare si un lien est renseigné.
- Gestion de la date d'expiration.
- QR Code invité affiché dans l'administration.
- Aucun changement volontaire du moteur de réservation validé.
