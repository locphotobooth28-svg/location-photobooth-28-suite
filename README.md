# Location Photobooth 28 Suite — V6.3.1

Correctif de la V6.3.

## Important
Conserve ton fichier `.env` actuel.

Puis lance :

```bash
npm install
npx prisma generate
npm run build
npm start
```

Vérifie ensuite :

`http://localhost:3000/api/health`

Résultat attendu :
- `ok: true`
- `version: 6.3.1`
- `database: ok`

Puis teste la création d'un événement.

## Correctifs
- Prisma 7 + PostgreSQL avec driver adapter.
- Création d'événement.
- Messages d'erreur frontend plus explicites.
- Planning et détection des conflits conservés.
