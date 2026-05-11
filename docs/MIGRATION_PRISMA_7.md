# Migration Prisma 5.22 → 7.8

Ce document trace la montée de version Prisma effectuée dans Humanix
Académie. Lire **avant** de déployer cette branche en production.

---

## 1. Pourquoi cette migration

- Prisma 5.x est en mode maintenance (sécurité uniquement)
- Prisma 6 et 7 apportent des améliorations de performance (TypeScript engine, queryCompiler)
- Garder l'écosystème à jour est une exigence d'audit (sécurité + maintenabilité)

## 2. Périmètre du changement

### Versions bumpées

| Paquet | Avant | Après |
|---|---|---|
| `prisma` | `^5.22.0` | `^7.8.0` |
| `@prisma/client` | `^5.22.0` | `^7.8.0` |
| `@auth/prisma-adapter` | `^2.7.0` | `^2.7.0` (carat, autorise auto-bump vers la dernière 2.x compatible) |

### Code refactorisé

- **`lib/db-readonly.ts`** : `datasources: { db: { url } }` → `datasourceUrl: url` (API stable v5.2+ jusqu'à v7+)

### Non touché (mais à vérifier post-install)

- `prisma/schema.prisma` : `generator client { provider = "prisma-client-js" }` — le **legacy generator** est conservé pour minimiser le risque. La migration vers le nouveau generator `prisma-client` (ESM, no engine binary) sera un PR séparé.
- `docker-entrypoint.sh` : `prisma db push` + `prisma db execute --stdin` — supposés stables en v7, à valider au premier deploy.
- `Dockerfile` : `npx prisma generate` — stable, devrait fonctionner.

---

## 3. Étapes pour appliquer la migration localement

```bash
# 1. Pull la branche
git pull origin develop

# 2. Réinstaller les dépendances (legacy-peer-deps requis pour next-auth beta)
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 3. Régénérer le Prisma client
npx prisma generate

# 4. Lancer les tests
npm test

# 5. Smoke build
npm run build

# 6. Smoke runtime local (si possible)
docker compose up -d --build
docker compose logs -f app
```

---

## 4. Checklist de validation

À cocher avant merge en `main` :

- [ ] `npm install` se termine sans erreur (warnings peer-deps OK)
- [ ] `npx prisma generate` produit `node_modules/@prisma/client` sans erreur
- [ ] `npm run lint` passe (warnings acceptables)
- [ ] `npm run typecheck` (tsc --noEmit) : 0 erreur
- [ ] `npm test` : tous les tests verts
- [ ] `npm run build` réussit
- [ ] `docker compose up --build` démarre sans erreur
- [ ] `prisma db push` synchronise correctement le schéma
- [ ] Login admin + magic link fonctionnent
- [ ] `/api/ai/chat` répond correctement (auth + RBAC + PII filter)
- [ ] `/admin/billing` charge sans erreur
- [ ] Aucun crash dans les logs liés à `@prisma/client`

---

## 5. Breaking changes potentiels à surveiller

### Risque ÉLEVÉ

1. **`@auth/prisma-adapter` matrice de compat.**
   - Si `npm install` warne sur un peer-dep mismatch avec Prisma 7, bumper manuellement vers `@auth/prisma-adapter@latest`.
   - Tester immédiatement le login admin pour vérifier que l'adapter fonctionne (sessions, comptes, magic links).

2. **Generator `prisma-client-js` legacy.**
   - Encore supporté en v7 mais marqué deprecated. Migration future vers `generator client { provider = "prisma-client" }` (nouveau generator ESM).
   - Tant qu'on reste sur le legacy, **rien ne change côté code** (mêmes imports `@prisma/client`).

### Risque MOYEN

3. **`db push` / `db execute` dans `docker-entrypoint.sh`.**
   - Les flags `--accept-data-loss` et `--stdin` sont supposés stables en v7. Si le déploiement échoue, basculer la probe Postgres vers `pg_isready` (paquet Alpine `postgresql-client`).

4. **`$transaction` interactives sans timeout explicite.**
   - 7 routes utilisent `$transaction(async (tx) => ...)`. Timeout par défaut Prisma : 5s. Pour les longues opérations (`lib/marketplace/install.ts:43`), considérer d'ajouter `{ timeout: 30_000 }` si on observe des `P2028` en prod.

5. **`Prisma.InputJsonValue` / `Prisma.JsonNull`.**
   - Utilisés dans `lib/audit.ts`. Pas de changement attendu en v7 mais à vérifier que les types compilent.

### Risque FAIBLE

6. **`$queryRawUnsafe` / `$executeRawUnsafe` dans `lib/ai/embeddings/pgvector.ts`.**
   - Signatures historiquement stables. À surveiller : le binding des paramètres ($1, $2...) ne devrait pas changer.

7. **Scripts standalone (`scripts/*.ts`).**
   - 7 fichiers instancient `new PrismaClient()`. Pas de changement attendu tant qu'on reste sur le legacy generator.

---

## 6. Rollback

Si la migration échoue en pré-prod, rollback en 3 commandes :

```bash
git revert <commit-sha-de-la-merge>
git push origin main
docker compose up -d --build
```

Le rollback est **safe** : aucun changement de schéma DB n'est inclus dans cette PR. La DB reste compatible avec Prisma 5.22 ET 7.8.

---

## 7. Suivi post-migration

À faire dans les **30 jours** après merge en prod :

1. Migrer vers le nouveau generator `prisma-client` (ESM, no binary engine) — PR séparée
2. Audit des `$transaction` longues pour ajouter `{ timeout }` explicite
3. Évaluer la migration vers les **migrations formelles** (`prisma migrate`) au lieu de `db push` (recommandé Prisma pour production)
4. Réviser les exclusions Prisma dans `vitest.setup.ts` si la signature interne change

---

## 8. Historique

| Date | Auteur | Action |
|---|---|---|
| 2026-05-11 | Florian + Claude | Migration 5.22 → 7.8 — preparation et bump versions |
