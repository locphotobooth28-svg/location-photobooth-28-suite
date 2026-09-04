# LP28 V2.8 — Comptes & sécurité

- Harmonisation PC de Paramètres > Comptes & accès : grille 2 colonnes, compte administrateur principal pleine largeur, permissions alignées et responsive mobile.
- Le compte Administrateur affiche clairement son accès complet sans grille de permissions modifiable.
- Sur mobile/tablette, les comptes, métadonnées, permissions et boutons repassent sur une seule colonne.
- Paramètres > Sécurité : changement du mot de passe du compte connecté avec contrôle du mot de passe actuel, confirmation et règles de complexité.
- Après changement de mot de passe, les appareils de confiance du compte sont révoqués par sécurité.
- Le correctif V2.7 Événements + reste à encaisser est conservé.

Validation : `node --check server.js` OK. Build Vite non exécuté : node_modules absent de l'archive source.
