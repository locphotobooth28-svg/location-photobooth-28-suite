# LP28 Suite 8.5.68 — Mathis V3.4

Correction ciblée des boutons de fin de diagnostic N1.

- « J'ai compris » fonctionne désormais.
- « J'ai compris, continuer l'événement » fonctionne désormais.
- « Continuer l'événement » fonctionne désormais.
- Les autres boutons N1 de fin (réseau rétabli, flash rétabli, voile fumée résolu) utilisent la même sortie centralisée.
- À la validation : N1 enregistré silencieusement, fenêtre Mathis fermée, retour au portail événement.
- La raison de résolution est envoyée directement au journal SAV afin d'éviter une valeur React précédente liée à setState asynchrone.
