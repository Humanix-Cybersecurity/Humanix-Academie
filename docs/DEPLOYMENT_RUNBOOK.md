# Deployment Runbook - Humanix Académie

Toutes les **actions manuelles** à exécuter au déploiement, par phase. Ne nécessite que les accès consoles habituels (Scaleway, Mollie, Apple Developer, dépôt GitHub) + `npm` + `psql` côté serveur.

> Ce runbook est cumulatif : si tu déploies pour la première fois, exécute tout dans l'ordre. Si tu redéploies, repère les sections marquées **« First-deploy only »**.

> **Couche conteneurs / Docker :** ce runbook couvre l'app (env, seed, SSO, flags). Pour les stacks Docker déployées (prod + démo), leur divergence assumée vis-à-vis du dépôt et la sauvegarde associée, voir [`INFRA_STACKS_DEPLOYED.md`](INFRA_STACKS_DEPLOYED.md).

---

## A. Pré-requis serveur

- [ ] Node 20+ installé sur la machine cible
- [ ] PostgreSQL 14+ accessible via `DATABASE_URL`
- [ ] Variables d'environnement de base posées : `DATABASE_URL`, `AUTH_SECRET` (min 32 chars, généré via `openssl rand -base64 32`), `AUTH_URL` (URL publique de l'app)
- [ ] HTTPS actif (les cookies sont `secure: true` en prod, sans HTTPS pas de session)

---

## B. Tenant Communauté (Phase 1)

> **First-deploy only** - idempotent, ne casse rien si tu relances.

```bash
npm run db:seed
```

Cette commande crée le tenant DB `humanix-community` (slug réservé) avec plan `starter`. Tous les LEARNERs gratuits y seront rattachés automatiquement.

Vérification :

```bash
psql $DATABASE_URL -c "SELECT slug, name, plan FROM \"Tenant\" WHERE slug='humanix-community';"
```

Doit retourner `humanix-community | Humanix Communauté | starter`.

Si tu vois plusieurs lignes ou un message vide : ne pas continuer Phase 2 tant que ce tenant n'existe pas.

---

## C. SSO providers (Phase 2)

Le bouton Google / Apple / Microsoft sur `/inscription` n'apparaît QUE si les env vars sont posées. L'absence d'un provider ne casse rien - les autres restent disponibles.

### C.1 - Google (recommandé en priorité)

- [ ] Console : https://console.cloud.google.com/apis/credentials
- [ ] Créer un OAuth 2.0 Client ID type "Web application"
- [ ] Authorized redirect URIs : `https://<ton-domaine>/api/auth/callback/google`
- [ ] Récupérer `Client ID` + `Client secret`
- [ ] Poser dans `.env` :
  ```
  AUTH_GOOGLE_ID="..."
  AUTH_GOOGLE_SECRET="..."
  ```

### C.2 - Microsoft Entra ID

- [ ] Azure Portal → App registrations → New registration
- [ ] Redirect URI : `https://<ton-domaine>/api/auth/callback/microsoft-entra-id`
- [ ] Récupérer Application (client) ID + créer un client secret
- [ ] Poser dans `.env` :
  ```
  AUTH_MICROSOFT_ENTRA_ID_ID="..."
  AUTH_MICROSOFT_ENTRA_ID_SECRET="..."
  AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/organizations/v2.0"
  ```

### C.3 - Apple "Sign in with Apple"

> Apple requiert un compte Apple Developer payant (99 $/an).

- [ ] Apple Developer → Certificates, Identifiers & Profiles
- [ ] Créer un **App ID** (humanix-cybersecurity.fr) avec capability "Sign in with Apple"
- [ ] Créer un **Services ID** (l'AUTH_APPLE_ID) avec :
  - Domains : `<ton-domaine>`
  - Return URL : `https://<ton-domaine>/api/auth/callback/apple`
- [ ] Créer une **Key** avec capability "Sign in with Apple", télécharger le `.p8` (à conserver, non re-téléchargeable)
- [ ] Générer le **JWT client secret** (validité max 6 mois) à partir de la `.p8` :
  ```bash
  # Méthode rapide : https://github.com/nextauthjs/next-auth-example
  # ou outil ad-hoc Node
  ```
- [ ] Poser dans `.env` :
  ```
  AUTH_APPLE_ID="<Services ID>"
  AUTH_APPLE_SECRET="<JWT généré ci-dessus>"
  ```
- [ ] **Récurrent** : régénérer le JWT tous les ~5 mois et redéployer (sinon Apple SSO casse silencieusement)

---

## D. Paiements (optionnel - instance commerciale)

Pour une instance qui veut accepter les abonnements payants, les
variables d'env suivantes doivent être renseignées (consulter
`.env.example` pour la liste à jour) :

- Provider de paiement (clé secrète + secret webhook HMAC)
- Identifiants des plans tarifaires
- Verrou `SIGNUP_ALLOW_SELF_SERVICE` (false par défaut)

Sans cette config, le parcours d'abonnement est désactivé proprement
(les visiteurs sont redirigés vers une page de contact).

---

## E. Provisionner un tenant manuellement

Pour répondre à une demande de `/demande-abonnement` ou pour bootstrapper un tenant en interne :

Le provisionnement passe par l'interface admin
(`/superadmin/tenants`) ou via la fonction
`lib/tenant-provisioning.ts:provisionTenantWithAdmin()` selon l'usage.

Étapes appliquées : vérification d'unicité de l'email ADMIN, génération
d'un slug unique, création atomique tenant + user, audit log
`TENANT_CREATED`, envoi optionnel d'un magic link de bienvenue.

---

## F. Bootstrapping du SUPERADMIN (Niveau 1)

> **First-deploy only** - un seul SUPERADMIN par défaut (le founder).

```bash
npm run db:bootstrap-admin
```

Suit les prompts pour saisir l'email + nom du founder. Le compte est créé avec `role=SUPERADMIN` sur le tenant Communauté (par défaut, peut être changé).

Vérifier :

```bash
psql $DATABASE_URL -c "SELECT email, role FROM \"User\" WHERE role='SUPERADMIN';"
```

---

## G. Flag DEMO_MODE

`DEMO_MODE` contrôle la posture globale de l'app :

| `DEMO_MODE` | `/demo` | `/inscription` | `/signup` |
|---|---|---|---|
| `true` (dev/showcase) | ✅ accessible | ❌ redirect vers `/demo` | ✅ accessible (form legacy) |
| `false` (prod) | ❌ 404 | ✅ accessible (Communauté) | ❌ redirect vers `/demande-abonnement` (sauf si `SIGNUP_ALLOW_SELF_SERVICE=true`) |

**En prod commerciale, toujours :**
- `DEMO_MODE` non posé ou `false`
- `SIGNUP_ALLOW_SELF_SERVICE` non posé ou `false`

---

## G-bis. Livrer une nouvelle version (livraison en 2 temps)

La livraison est **volontairement en deux temps** : la CI construit et valide,
un humain décide et déploie sur la machine. Aucun accès entrant, aucune clé SSH
dans GitHub.

> ⚠️ **L'image GHCR n'est PAS l'artefact de déploiement de ces stacks.**
> Elle est publiée en **mode OSS pur**, volontairement **sans le submodule
> privé `content-pro`** (le workflow a un garde-fou qui fait échouer le
> build s'il est présent). La déployer ferait tomber le catalogue de ~37
> saisons à 2 : le site deviendrait une coquille vide. Elle sert la
> **distribution aux self-hosters**, pas la démo ni la production, qui ont
> besoin du contenu commercial et donc d'un build local.

**Temps 1 — automatique (GitHub Actions).** `docker-publish.yml` build,
smoke-teste et publie l'image OSS sur GHCR avec provenance SLSA + SBOM :

| Tag publié | Quand | Destiné à |
|---|---|---|
| `:edge` | à chaque push sur `main` | self-hosters qui suivent le fil |
| `:latest` + `:1.2.3`, `:1.2`, `:1` | sur un tag git `v*.*.*` | self-hosters, version stable |
| `:main-<sha7>` | à chaque push sur `main` | rejouer un build précis |

Ces tags servent la **distribution OSS**. La démo et la production, elles, sont
livrées depuis le clone git avec `content-pro` (temps 2 ci-dessous).

**Temps 2 — manuel (toi, sur `humanix-prod-01`).** `scripts/deploy.sh` met le
clone sur un commit **précis**, met à jour `content-pro`, rebuild et
enregistre ce qui a été déployé :

```bash
./scripts/deploy.sh demo             # démo -> dernier commit de main
./scripts/deploy.sh prod v1.2.3      # prod -> un tag (demande confirmation)
./scripts/deploy.sh prod --dry-run   # montre le plan, ne touche à rien
```

Le script **refuse de builder si `content-pro/` est vide** — sans ce garde-fou
le build réussit, le site démarre, et le catalogue est simplement vide : panne
totalement silencieuse.

Il résout aussi le bon remote tout seul : sur ces stacks, `origin` pointe vers
`humanix-content-pro` et c'est **`upstream`** qui pointe vers l'application. Un
`git pull` nu tirerait le mauvais dépôt.

### Pourquoi c'est important (cause racine, pentest du 7 mai)

La divergence prod/main ne venait pas du fait de builder sur place, mais du
fait que **personne ne savait à quel commit le clone était**. Le script épingle
désormais un commit précis et écrit une trace lisible :

```bash
cat /opt/humanix-demo/.humanix-deployed
# commit=...  ref=main  content_pro=...  deployed_at=...  deployed_by=...
```

### Pré-requis : accès au submodule privé

La machine doit pouvoir cloner `humanix-content-pro` (clé de déploiement). Sans
ça le script s'arrête avec le code 3 plutôt que de livrer un catalogue vide.

Le `docker-compose.yml` de `/opt/...` a volontairement divergé du dépôt (cf.
[`INFRA_STACKS_DEPLOYED.md`](INFRA_STACKS_DEPLOYED.md)) : le script ne le touche
pas et signale les modifications locales qu'il préserve.

---

## H. Smoke tests post-deploy

À lancer après chaque déploiement majeur :

- [ ] `https://<domaine>/` → page d'accueil charge sans erreur
- [ ] `https://<domaine>/inscription` → page accessible, boutons SSO visibles selon les providers configurés
- [ ] `https://<domaine>/connexion` avec email Google inconnu → rejet `NoAccount` (sécurité préservée)
- [ ] `https://<domaine>/signup` → redirige vers `/demande-abonnement` (verrou actif)
- [ ] `https://<domaine>/admin` quand non connecté → redirect `/connexion`
- [ ] `https://<domaine>/admin` quand LEARNER → redirect `/apprendre` (gating role)
- [ ] Setup MFA d'un compte → QR scanné → code TOTP accepté

---

## I. Checklist pré-launch OSS (26 mai 2026)

- [ ] Tenant Communauté créé (B)
- [ ] AUTH_SECRET rotaté + en coffre
- [ ] Au moins UN provider SSO actif (Google recommandé) (C)
- [ ] DEMO_MODE désactivé en production
- [ ] SIGNUP_ALLOW_SELF_SERVICE désactivé par défaut
- [ ] SUPERADMIN bootstrap fait (F)
- [ ] Smoke tests passés (H)
- [ ] Backups DB automatiques activés
- [ ] Logs centralisés (Sentry / Scaleway logs)
- [ ] `POSTGRES_READONLY_PASSWORD` généré et en coffre
- [ ] `DATABASE_URL_READONLY` configurée + `prisma/sql/post-migration-grants.sql` appliqué
- [ ] Audits externes lancés sur `/securite/audits-externes` → A+ partout

---

## J. À ajouter post-launch

- [ ] Phase 4 : redirect post-login par rôle (LEARNER → `/apprendre`, ADMIN+ → `/admin`)
- [ ] Phase 5 : transfert d'un LEARNER Communauté vers un tenant payant qui l'invite (UX : un click "Rejoindre l'équipe X")
- [ ] Renouvellement automatique du JWT Apple (cron tous les 5 mois)
- [ ] Job de purge `BillingEvent` > 13 mois (RGPD)
- [ ] Per-seat billing fin (aujourd'hui : forfait par tier, le seat count saisi est en metadata pour reconciliation manuelle si débordement)
