# LP28 V2.7 — Corrections urgentes

- Correction de l'écran noir lors de l'ouverture de « Voir l'événement » : le modal reçoit désormais explicitement le contexte administrateur et les permissions événement.
- Les actions Modifier / Contrat / Documents dans le modal respectent les droits du compte.
- Le tableau de bord « Reste à encaisser cette semaine » tient désormais compte de « Prestation réglée » : une prestation dont le solde est marqué payé contribue à 0 €.
- L'API renvoie également un solde à 0 pour une prestation marquée réglée, y compris pour les événements déjà enregistrés avec un ancien solde stocké.
