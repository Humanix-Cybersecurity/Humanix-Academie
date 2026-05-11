# Migration Prisma — montée 5.22 → 6.16 (et pas 7.x, voir § 0)

## 0. Pourquoi pas Prisma 7 ?

**Tentative initiale échouée** : la PR #469 bumpait directement à Prisma 7.8. Le build Docker a cassé immédiatement avec :

```
Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: The datasource property `url` is no longer supported in schema files.
       Move connection URLs for Migrate to `prisma.config.ts` and pass either
       `adapter` for a direct database connection or `accelerateUrl` for
       Accelerate to the `PrismaClient` constructor.
```

**Cause** : Prisma 7 supprime `url = env("DATABASE_URL")` du bloc `datasource db { ... }` de `schema.prisma`. Il faut désormais :

- Créer un `prisma.config.ts` à la racine pour la CLI (`prisma generate`, `prisma db push`, etc.)
- Migrer **toutes** les instanciations `new PrismaClient()` pour utiliser un **driver adapter** (`@prisma/adapter-pg` + le paquet `pg`) ou Prisma Accelerate

**Décision** : on bump à **Prisma 6.16** (dernier major qui supporte `url` dans le schema) pour cette PR. La migration vers Prisma 7 + driver adapter fera l'objet d'une PR dédiée plus tard (~1 semaine de travail :15 sites à refactorer + tests).

Cette montée v5 → v6 apporte déjà les bénéfices principaux :
- Améliorations perf et fiabilité de l'engine
- Support PostgreSQL 17
- Meilleures erreurs de typage
- Préparation au TypeScript engine optionnel
- Maintenance LTS active

---

## 1. Versions bumpées

| Paquet | Avant | Après |
|---|---|---|
| `prisma` | `^5.22.0` | `^6.16.0` |
| `@prisma/client` | `^5.22.0` | `^6.16.0` |
| `@auth/prisma-adapter` | `^2.7.0` | `^2.7.0` (carat, autorise auto-bump 2.x compat Prisma 6) |

## 2. Code refactorisé

- **`lib/db-readonly.ts`** : `datasources: { db: { url } }` → `datasourceUrl: url` (API stable v5.2+ jusqu'à v6+). Pas de regression v5 si on revert.

## 3. Non touché

- `prisma/schema.prisma` : `datasource db` + `generator client { provider = "prisma-client-js" }` — compatibles v6, intacts.
- `docker-entrypoint.sh` : `prisma db push` + `prisma db execute --stdin` — stables en v6.
- `Dockerfile` : `npx prisma generate` — stable en v6.

---

## 4. Étapes pour appliquer la migration localement

```bash
# 1. Pull la branche
git pull origin develop

# 2. Réinstaller les dépendances (legacy-peer-deps requis pour next-auth beta)
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 3. Régénérer le Prisma client (Prisma 6 = même API qu'en v5)
npx prisma generate

# 4. Lancer les tests
npm test

# 5. Smoke build
npm run build

# 6. Smoke runtime
docker compose up -d --build
docker compose logs -f app
```

---

## 5. Checklist de validation

À cocher avant merge en `main` :

- [ ] `npm install` se termine sans erreur (warnings peer-deps OK)
- [ ] `npx prisma generate` produit `node_modules/@prisma/client` sans erreur
- [ ] `npm run lint` passe
- [ ] `npm test` : tous verts
- [ ] `npm run build` réussit
- [ ] `docker compose up --build` démarre
- [ ] Login admin + magic link fonctionnent
- [ ] `/api/ai/chat` répond (auth + RBAC + PII filter)
- [ ] `/admin/billing` charge sans erreur
- [ ] Aucun crash dans les logs lié à `@prisma/client`

---

## 6. Roadmap migration Prisma 7 (PR séparée, ~1 semaine)

Quand on voudra passer à Prisma 7 :

### Étape A : driver adapter Postgres

```bash
npm install --legacy-peer-deps @prisma/adapter-pg pg
npm install --legacy-peer-deps -D @types/pg
```

### Étape B : nouveau `prisma.config.ts`

```ts
// prisma.config.ts (NEW, racine du repo)
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Étape C : retirer `url` de `schema.prisma`

```diff
 datasource db {
   provider = "postgresql"
-  url      = env("DATABASE_URL")
 }
```

### Étape D : adapter tous les `new PrismaClient()`

15 sites à refactorer (`lib/db.ts`, `lib/db-readonly.ts`, 7 scripts dans `scripts/`, `prisma/seed.ts`, `prisma/seed-anecdotes.ts`, `docker-entrypoint.sh` ligne 61, etc.) :

```diff
- import { PrismaClient } from '@prisma/client';
+ import { PrismaClient } from '@prisma/client';
+ import { PrismaPg } from '@prisma/adapter-pg';

- const db = new PrismaClient();
+ const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
+ const db = new PrismaClient({ adapter });
```

### Étape E : tests + validation

- Régénérer le client : `npx prisma generate`
- Lancer tous les tests : `npm test`
- Smoke build + runtime

Pourquoi c'est un effort de ~1 semaine et pas 1 heure :
- 15 sites où `PrismaClient` est instancié
- Tests à valider (mocks Prisma à adapter si besoin)
- Comportement transactionnel du driver adapter à vérifier
- Migration de l'entrypoint Docker
- Documentation des breaking changes

---

## 7. Rollback (si Prisma 6 casse aussi)

Safe : aucun changement DB inclus dans cette PR. Si v6 pose problème :

```bash
git revert <merge-commit-sha>
git push origin develop
```

Puis on reste sur Prisma 5.22 en attendant qu'on planifie la migration v7 + driver adapter sérieusement.

---

## 8. Historique

| Date | Auteur | Action |
|---|---|---|
| 2026-05-11 | Florian + Claude | Tentative migration 5.22 → 7.8 — bloqué par breaking `url` in schema |
| 2026-05-11 | Florian + Claude | Pivot : migration 5.22 → 6.16 (stable, sans driver adapter) |
