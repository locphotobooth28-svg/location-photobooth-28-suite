# LP28 Suite V8.3.0 — Galeries Admin

## Migration

Conserve ton `.env`.

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

Ne lance jamais `prisma migrate reset` sur la base réelle.

## Test V8.3
1. Ouvre le nouveau menu `📸 Galeries`.
2. Ouvre une galerie existante.
3. Vérifie les compteurs.
4. Teste les filtres Visible / Masquée.
5. Ouvre une photo en grand.
6. Masque-la puis vérifie le portail invité.
7. Réaffiche-la.
8. Vérifie le QR Code invité.
9. Teste la date d'expiration.
10. Pour supprimer définitivement, `DELETE` reste obligatoire.

## QR Code
La V8.3 affiche un QR Code du portail invité dans l'espace administrateur.
