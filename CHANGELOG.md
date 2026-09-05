## 8.5.82 — API Widget Android LP28

- Ajout de `/api/widget/summary` protégé par la session utilisateur.
- Supervision Lola/Nina/Gabin, événements en cours et alertes Mathis N2/N3.
- Aucun secret API embarqué dans le widget Android : authentification par la session LP28.

## 8.5.81 — Diagnostic photo manuel ChatGPT
- Suppression de l’appel automatique à l’API OpenAI pour les photos SAV.
- Récupération sécurisée de la dernière photo de la galerie client, avec repli sur la photo SAV.
- Aperçu, ouverture et téléchargement de la photo depuis Assistance.
- Génération dynamique et copie du message de diagnostic à coller dans ChatGPT.
- Conservation du consentement avant récupération/transmission manuelle.


## 8.5.80 — Correctif saisie mobile SAV
- Corrige la perte de focus du clavier Android lors de la saisie du prénom et du téléphone dans la demande N2.
- Évite le remontage du bloc de statut Mathis à chaque caractère saisi.
- Supprime les formulaires N2 dupliqués et conserve une seule source de saisie.
- Corrige l’affichage des cases à cocher de consentement/analyse photo et de disponibilité sur mobile et desktop.
# LP28 Suite — Changelog

## 8.5.77 — Nettoyage SAV, aperçu client et diagnostic photo Mathis
- Suppression définitive d’une assistance terminée : suppression préalable de ses photos SAV dans Google Drive, puis nettoyage de la base. En cas d’échec Drive, l’assistance est conservée pour permettre de réessayer.
- Ajout du bouton Admin « Voir en tant que… » à côté de Partager : aperçu Organisateur ou Invité dans un nouvel onglet, sans changer le compte Admin.
- Ajout de « Analyser la dernière photo de la borne » dans Assistance. Mathis privilégie la dernière photo originale LumaBooth de l’événement, puis une photo SAV en secours.
- Diagnostic IA : exposition/netteté et recommandations Nikon D7200 (ISO, vitesse, ouverture, focale, flash), avec niveau de confiance et formulation prudente sur le déclenchement du flash.
- L’analyse IA nécessite OPENAI_API_KEY sur Render ; modèle configurable via OPENAI_VISION_MODEL.

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
