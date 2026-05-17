# Sécurité — runbook de durcissement Zero-Trust / Least Privilege

> Document technique · Version 1.0 · 17 mai 2026
> Récap des Sprints sécurité 1, 2, 3, 4 (mai 2026). Une page pour TOUT
> savoir activer après un déploiement.

Ce document est le **point d'entrée unique** pour activer les mesures
de sécurité Zero-Trust / Least Privilege livrées en mai 2026. Si tu
clones le repo aujourd'hui, ce runbook est ce qu'il te faut.

Documents complémentaires :
- [`installation.md`](./installation.md) — première installation
- [`DEPLOYMENT_RUNBOOK.md`](./DEPLOYMENT_RUNBOOK.md) — déploiement prod
- [`SECRETS.md`](./SECRETS.md) — interface `getSecret()` (Sprint 3)
- [`/securite/rapport-audit`](../app/securite/rapport-audit/page.tsx) — rapport public daté

---

## TL;DR — checklist par état d'instance

### Tu démarres une **NOUVELLE** instance Humanix

✅ Tout est automatique. Le `docker compose up -d` provisionne :
- Le rôle Postgres `humanix_readonly` au premier boot (image custom)
- Le CSP nonce per-request (proxy.ts)
- La passkey-first UX (page `/connexion`)

Étapes manuelles **une seule fois** :
1. Générer un password fort pour `POSTGRES_READONLY_PASSWORD` (cf. § 1)
2. Appliquer les REVOKE chirurgicaux après `prisma db push` (cf. § 2)
3. Lancer les audits externes (cf. § 4)

### Tu MIGRE une instance Humanix existante

⚠️ Trois étapes obligatoires :
1. Provisionner manuellement le rôle read-only sur la base existante
   (le script init ne se déclenche que sur un volume Postgres neuf) — cf. § 1.bis
2. Mettre à jour le `.env` avec `DATABASE_URL_READONLY` et `POSTGRES_READONLY_PASSWORD`
3. Redémarrer l'app

---

## 1. Provisionner le rôle Postgres read-only

### 1.a — Nouvelle instance (Docker Compose)

Au premier `docker compose up`, l'image custom `humanix-postgres:secured`
provisionne automatiquement les rôles si `POSTGRES_READONLY_PASSWORD`
est défini dans le `.env`.

```bash
# Génère un password fort (32 octets b64)
openssl rand -base64 32

# Ajoute-le dans ton .env
echo 'POSTGRES_READONLY_PASSWORD="<le_password_genere>"' >> .env

# Démarre la stack
docker compose up -d
```

Vérification :
```bash
docker compose exec postgres psql -U humanix -d humanix -c "\du humanix_*"
# Doit lister : humanix_readonly + humanix_ro_user
```

### 1.b — Instance existante (Postgres déjà initialisé)

Le script `/docker-entrypoint-initdb.d/01-create-readonly-role.sh` ne
tourne **pas** sur un volume Postgres déjà initialisé. Tu dois appliquer
le SQL manuellement :

```bash
# Note : remplace 'CHANGE_ME_BEFORE_PROD' par ton vrai password
# dans le fichier avant d'exécuter, OU utilise un sed inline
docker compose exec postgres psql -U humanix -d humanix \
  < prisma/sql/setup-readonly-role.sql
```

Le script SQL est idempotent (peut être rejoué) mais le password par
défaut `CHANGE_ME_BEFORE_PROD` doit être remplacé.

### 1.c — Postgres externe (managé Scaleway, AWS RDS, etc.)

Identique à 1.b : applique `prisma/sql/setup-readonly-role.sql` avec
`psql` connecté à la base managée, après avoir remplacé le password.

---

## 2. REVOKE chirurgicaux post-Prisma migration

Les tables `User`, `Account`, `VerificationToken` contiennent des
secrets (passwordHash, refresh_token, magic links). Le rôle read-only
doit avoir SELECT sur **tout sauf** ces 3 tables.

Mais ces tables n'existent **pas** au premier boot Postgres (Prisma les
crée plus tard via `db push` ou migrations). On applique donc les
REVOKE après la première migration :

```bash
# Une seule fois après le tout premier prisma db push :
docker compose exec postgres psql -U humanix -d humanix \
  < prisma/sql/post-migration-grants.sql
```

Ça applique :
- `REVOKE SELECT ON User|Account|VerificationToken FROM humanix_readonly`
- Crée la vue `v_user_analytics` (colonnes non-PII seulement)
- `GRANT SELECT ON v_user_analytics TO humanix_readonly`

Vérification : connecte-toi en `humanix_ro_user` et teste :
```sql
SELECT * FROM "Tenant" LIMIT 1;             -- OK
SELECT * FROM "User" LIMIT 1;               -- permission denied
SELECT * FROM v_user_analytics LIMIT 1;     -- OK
CREATE TABLE test (id int);                 -- permission denied
```

---

## 3. Configurer DATABASE_URL_READONLY dans l'app

Si tu utilises l'image custom `humanix-postgres:secured`, c'est
**déjà fait** dans le `docker-compose.yml` :

```yaml
environment:
  DATABASE_URL_READONLY: "postgresql://humanix_ro_user:${POSTGRES_READONLY_PASSWORD}@postgres:5432/humanix?schema=public"
```

Sinon (Postgres externe), ajoute dans `.env` :
```bash
DATABASE_URL_READONLY="postgresql://humanix_ro_user:<password>@host:5432/humanix?schema=public"
```

Redémarre l'app :
```bash
docker compose restart app
```

5 modules basculent automatiquement sur le client read-only :
- `lib/admin/heatmap.ts`
- `lib/admin/at-risk-users.ts`
- `lib/analytics/risk-forecast.ts`
- `lib/analytics/risk-trend.ts`
- `lib/risk-score.ts` (uniquement `computeRiskScore`)

**Si l'env var est vide** : fallback transparent sur `DATABASE_URL`
(zéro régression, juste pas de défense en profondeur).

---

## 4. Lancer les audits externes

Une fois l'app déployée en HTTPS publique, lance les 4 scanners depuis
la page Trust Center :

`https://<ton-domaine>/securite/audits-externes`

Cibles :

| Scanner | Cible | URL directe |
|---|---|---|
| Mozilla Observatory | A+ | `observatory.mozilla.org/analyze/<host>` |
| Security Headers | A+ | `securityheaders.com/?q=https://<host>` |
| Qualys SSL Labs | A+ | `ssllabs.com/ssltest/analyze.html?d=<host>` |

Si un score est en-dessous de A+ :
1. Lire le rapport détaillé du scanner
2. Créer un ticket pour remédier **avant** de communiquer publiquement
3. Une fois corrigé, relancer le scan (les liens cachent 24h, ajouter
   `&clearCache=on` pour forcer)

---

## 5. WebAuthn passkey-first

Aucune configuration serveur supplémentaire. Le comportement est
automatique :

- **1ère visite** d'un utilisateur sur `/connexion` → tab "Mot de passe" par défaut
- **Après un login WebAuthn réussi** → flag `humanix:pref:webauthn=1`
  posé en localStorage du navigateur
- **Visites suivantes sur le même navigateur** → tab "Clé" par défaut

Pour qu'un utilisateur enrôle une passkey :
1. Login classique (password)
2. Va sur `/profil/securite` → bouton "Ajouter une clé d'accès"
3. Authentifie avec sa clé (Touch ID, Windows Hello, YubiKey, etc.)
4. Au prochain login, la passkey est proposée en premier

---

## 6. CSP nonce per-request (transparent)

Le middleware `proxy.ts` génère un nonce 96 bits par requête et l'injecte
dans le header `Content-Security-Policy: script-src 'self' 'nonce-XXX'`.

Les 4 scripts inline du site (`app/layout.tsx` × 3 + `app/librairie/[slug]` × 1)
récupèrent ce nonce via `lib/csp-nonce.ts` et l'attribuent à leur balise
`<script>`.

**Si tu ajoutes un script inline custom** (analytics, A/B test, etc.) :
1. Importer `getCspNonce()` depuis `@/lib/csp-nonce`
2. Récupérer `const nonce = await getCspNonce()`
3. L'attribuer à ton `<script nonce={nonce}>`

Sans nonce, le navigateur **bloquera** ton script (CSP strict).

---

## 7. Interface secrets (préparation Vault)

Cf. [`SECRETS.md`](./SECRETS.md) — couche d'abstraction `getSecret()`
pour préparer une intégration Scaleway Secret Manager / HashiCorp Vault.

**Statut actuel** : interface livrée + tests, **aucun call site migré**.
Le code existant `process.env.MISTRAL_API_KEY` continue de marcher.

À migrer **uniquement** :
- Si un client demande explicitement Vault
- Si tu ajoutes un nouveau secret (l'écrire d'emblée avec `getSecret`)
- Si un test a besoin de mocker un secret

---

## 8. Smoke test final

Après tout déploiement sécurité, exécute ce smoke test :

```bash
# 1. App répond
curl -fsSL https://<host>/api/health | jq

# 2. CSP nonce présent dans le response header
curl -sI https://<host>/ | grep -i content-security-policy
# Doit contenir : 'nonce-...' 'strict-dynamic'

# 3. Trust Center accessible
curl -fsSL https://<host>/securite/audits-externes -o /dev/null

# 4. dbReadOnly actif (côté admin connecté)
# Aller sur /admin/analytics/forecast → la page doit charger sans erreur

# 5. Login WebAuthn fonctionnel (si une passkey est enrolée)
# /connexion → cliquer "Clé" → entrer email → valider avec sa clé
```

---

## Mise à jour de ce document

Édité par le sprint qui livre des changements sécurité. Versionner :
- v1.0 (17 mai 2026) — sprint initial Zero-Trust / Least Privilege
