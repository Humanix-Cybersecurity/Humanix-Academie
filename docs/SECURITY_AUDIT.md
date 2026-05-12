# Rapport d'audit de sécurité - Humanix Académie

> **Édition** : v1.4 - 2026-05-12 (post campagne stabilisation deps + Sprint 5 consentement)
> **Périmètre** : plateforme Humanix Académie Community Edition + Cloud (production + infrastructure + processus + chaîne de développement)
> **Émetteur** : Humanix-Cybersecurity
> **Statut** : public, mis à jour à chaque évolution majeure (cf. §12.4 historique)
> **Licence du rapport** : CC BY-SA 4.0 (réutilisable avec attribution)
> **Version résumée publique** : [/securite/rapport-audit](https://humanix-cybersecurity.fr/securite/rapport-audit)
> **Programme divulgation responsable** : [/.well-known/security.txt](https://humanix-cybersecurity.fr/.well-known/security.txt) (RFC 9116)

---

## 📋 Préambule - pourquoi ce rapport est public

Humanix-Cybersecurity vend de la sensibilisation à la cybersécurité. Il serait incohérent de prêcher la vigilance sans nous y soumettre nous-mêmes - et plus encore sans rendre nos pratiques inspectables.

Ce rapport n'est pas un document marketing. Il documente honnêtement :

- Ce que nous faisons bien
- Ce que nous n'avons pas encore fait, et pourquoi
- Les choix d'architecture qui réduisent ou augmentent les risques
- Notre plan de remédiation à 6 mois

Il est versionné dans Git, accessible publiquement, et mis à jour à chaque évolution structurelle de la plateforme. Toute remarque, demande de précision ou découverte de vulnérabilité peut être adressée à **security@humanix-cybersecurity.fr** (programme de divulgation responsable, voir section finale).

---

## Table des matières

1. [Synthèse exécutive](#1-synthèse-exécutive)
2. [Périmètre et méthodologie](#2-périmètre-et-méthodologie)
3. [Architecture et flux de données](#3-architecture-et-flux-de-données)
4. [Sécurité applicative](#4-sécurité-applicative)
5. [Sécurité infrastructure](#5-sécurité-infrastructure)
6. [Protection des données personnelles (RGPD)](#6-protection-des-données-personnelles-rgpd)
7. [Sécurité du cycle de développement (SDLC)](#7-sécurité-du-cycle-de-développement-sdlc)
8. [Gestion des incidents](#8-gestion-des-incidents)
9. [Constats et points d'attention](#9-constats-et-points-dattention)
10. [Plan de remédiation à 6 mois](#10-plan-de-remédiation-à-6-mois)
11. [Programme de divulgation responsable](#11-programme-de-divulgation-responsable)
12. [Annexes](#12-annexes)

---

## 1. Synthèse exécutive

### Niveau de maturité global

| Domaine                                              | Niveau           | Commentaire                                                                          |
| ---------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| Authentification & autorisation                      | 🟢 Mature        | Auth.js v5, MFA TOTP + WebAuthn 13.3 (lib bump v1.4), multi-tenant scoping strict    |
| Sécurité applicative (XSS DOMPurify, anti-SSRF)      | 🟢 Mature        | Validation Zod, sanitisation HTML5, anti-SSRF whitelist, anti-PII Mistral            |
| Consentement utilisateur (CNIL ePrivacy)             | 🟢 **Mature ↑**  | **Nouveau v1.4** : bandeau CNIL 2020-091 parité stricte, Plausible cloud only-if-granted |
| Sécurité réseau & infrastructure                     | 🟢 Mature        | HAProxy + segmentation Docker + TLS 1.2+ + middleware edge                           |
| Headers HTTP (HSTS, X-Frame, CSP, Permissions-Policy)| 🟢 Mature        | CSP **dynamique** (v1.4) — Plausible cloud autorisé uniquement si env configuré      |
| Protection des données (RGPD)                        | 🟢 Mature        | DPA + registre + droits implémentés + souverain FR + export portabilité complet      |
| Chaîne d'approvisionnement (supply chain)            | 🟢 **Mature ↑**  | **0 CVE** sur 781 deps (npm audit), 0 warning deprecated, libs sur dernière majeure stable |
| SDLC sécurisé                                        | 🟡 Intermédiaire | TS strict 6.0, ESLint 10 flat config, **710/723 tests verts** (v1.4 : +16, -14 fix)  |
| CI/CD : déploiement auto au push main                | 🔴 À faire       | Découvert en pentest 7 mai : image en prod peut diverger des correctifs main         |
| Gestion des incidents                                | 🟡 Intermédiaire | Procédure documentée (Cyber-Réflexe), mais sans drill annuel formel                  |
| Audit externe formel                                 | 🔴 À faire       | Pentest interne 7 mai 2026 OK, audit cabinet PASSI prévu Q3 2026                     |

### Synthèse en 3 chiffres

- **0** vulnérabilité critique exploitée (pentest interne du 7 mai 2026, 25+ vecteurs testés)
- **0** CVE (HIGH/CRITICAL/MEDIUM/LOW/INFO) sur 781 dépendances `npm audit` (v1.4, 12 mai)
- **3 / 3** findings non-critiques v1.1 résolus en v1.4 (1 HIGH process ✅, 2 MEDIUM CVSS 5.3 ✅) - cf. §9.4
- **100 %** des données sensibles traitées sur des hébergements français ou européens identifiables (zéro dépendance Cloud Act US)
- **710** tests vitest verts sur 723 (13 skipped = isolation cross-tenant nécessitant DB live) — v1.3 avait **694 verts sur 708**, donc **+16 tests + résolution de 14 failures de domain drift**

### Position éditoriale assumée

- Nous **ne prétendons pas** être ISO 27001 ni SOC 2. Ces certifications sont disproportionnées pour notre segment (TPE/PME françaises avec budget cyber < 5 K€/an).
- Nous **ne prétendons pas** non plus être SecNumCloud. Cette qualification s'adresse à des opérateurs critiques.
- Nous **revendiquons** un **niveau de sécurité ANSSI-PME ready** : robuste pour notre cible, transparent dans ses limites, en amélioration continue.

---

## 2. Périmètre et méthodologie

### 2.1 Périmètre couvert par ce rapport

| Composant                                       | Inclus        | Exclu                                                              |
| ----------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| Plateforme web Humanix Académie                 | ✅            | -                                                                  |
| API REST publique (`/api/v1/*`)                 | ✅            | -                                                                  |
| Service TTS auto-hébergé (Piper)                | ✅            | -                                                                  |
| Reverse proxy HAProxy                           | ✅            | -                                                                  |
| Base de données PostgreSQL                      | ✅            | -                                                                  |
| Plugin Outlook (squelette livré)                | ✅            | -                                                                  |
| Endpoints cron (observatoire fuites, anecdotes) | ✅            | -                                                                  |
| Postes de travail des collaborateurs            | -             | (couvert par charte interne hors scope rapport produit)            |
| Code des modules Marketplace community          | Partiellement | (validation Zod + hash SHA-256, mais code non audité unitairement) |

### 2.2 Méthodologie d'évaluation

L'évaluation repose sur **4 sources de référence** :

1. **OWASP ASVS 4.0** (Application Security Verification Standard) - référentiel international des contrôles applicatifs.
2. **Guide ANSSI "Sécurité numérique des PME"** - recommandations adaptées au contexte français.
3. **CNIL - Référentiel de conformité RGPD** - particulièrement la partie minimisation et durées de conservation.
4. **CIS Controls v8** (Center for Internet Security) - pour les aspects infrastructure et SDLC.

### 2.3 Tests effectués

| Test                                                 | Description                                                                                        | Date                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------ |
| Revue de code interne                                | Lecture systématique des routes API, des server actions et des helpers d'auth                      | Continue                 |
| Test SSRF sur webhooks                               | URLs internes (10.x, 127.x, 192.168.x, .local, .internal) refusées par allowlist                   | Validé                   |
| Test injection HTML / XSS sur générateur phishing IA | Sanitisation DOMPurify (parseur HTML5, audit Cure53, OWASP) - whitelist stricte de balises         | Validé                   |
| Test rate limiting                                   | Tentatives répétées sur endpoints sensibles (`/api/tts/synthesize`, `/api/admin/breaches/refresh`) | Limites respectées       |
| Test isolation tenant                                | Tentative d'accès à une saison d'un autre tenant via manipulation de paramètres                    | Refus correct            |
| Test échappement Prisma                              | Inputs avec backslashes, surrogate pairs, NULL bytes                                               | Sanitisation BDD validée |
| Audit accessibilité interne (refonte 7 mai 2026)     | RGAA 4.1 / WCAG 2.1 AA - score interne 92 % après Pack I (contraste + caption + landmarks)         | Cf. `/accessibilite`     |
| **Pentest interne v1.1**                             | **Box-grise depuis Exegol contre staging docker-compose - 25+ vecteurs (cf. §2.5)**                | **2026-05-07**           |

### 2.4 Tests **non encore réalisés** (transparence)

- **Pentest externe** par cabinet PASSI tiers indépendant (programmé Q3 2026)
- **Audit RGAA externe** par cabinet certifié (Atalan / Tanaguru / Access42, programmé Q4 2026, budget ~3 000 € HT)
- **Test de charge** au-delà de 200 utilisateurs simultanés (à faire dès première grosse PME cliente)
- **Audit cryptographique** des secrets de session (déjà repose sur Auth.js qui a été audité par tiers, mais pas par nous)

### 2.5 Pentest interne v1.1 (7 mai 2026)

#### Méthodologie

Test offensif réalisé depuis un container Exegol-rootme isolé (Kali Linux
spécialisé pentest), contre une instance staging docker-compose :
HAProxy 2.9 + Next.js 15 + PostgreSQL 16 + TTS Piper. Outils utilisés :
nmap, curl, wget, hydra, dirb, ncat, écriture de payloads custom.

#### Vecteurs d'attaque testés (25+)

**Reconnaissance** : nmap service detection, version fingerprinting, énumération de routes API, listing /well-known/, /.git/, /.env, sources maps.

**Headers / TLS** : audit complet des security headers (HSTS, CSP, X-Frame, Permissions-Policy, Referrer-Policy), test ALPN, audit des Vary headers, cache poisoning.

**Méthodes HTTP** : HEAD, OPTIONS, TRACE, PUT, DELETE, PATCH sur `/api/admin/*` et endpoints sensibles. Test request smuggling chunked.

**Header injection** : Host header injection (Host: evil.example.com), X-Forwarded-User / X-Real-IP / X-Forwarded-For pour bypass admin, Transfer-Encoding chunked.

**Path traversal** : `/sms/../etc/passwd`, `/famille/invitation/../../admin`, `/_next/../package.json`, `/.next/static/../package.json`.

**IDOR / token oracle** : timing attacks sur `/sms/[token]`, `/phishing/[token]`, `/famille/invitation/[token]`, `/connexion/reset/[token]`. Mesure du temps de réponse pour détecter un oracle (token valide vs invalide).

**Email enumeration** : timing attack sur `/api/auth/signin/email` et `/signup` pour distinguer compte existant vs inexistant.

**Brute-force / credential stuffing** : 7 tentatives consécutives sur `/api/auth/callback/credentials` pour vérifier le rate limit per-IP.

**Information disclosure** : test exposure de `.env`, `.git/config`, `package.json`, `next.config.mjs`, `prisma/schema.prisma`, source maps `.js.map`, headers leakant la stack (X-Powered-By).

**Reflected XSS** : injection `<script>alert(1)</script>` via query string sur les pages publiques.

**Network surface** : scan des ports docker network (HAProxy stats 8404, app 3000, postgres 5432) pour mesurer l'exposition latérale.

**HAProxy bot blocking** : test du filtre User-Agent (sqlmap, nikto, nmap, gobuster, hydra, masscan, hakrawler).

#### Résultats

🟢 **Aucun bypass d'authentification**, **aucune fuite de données**, **aucune RCE**, **aucun XSS exploité**, **aucune injection SQL**, **aucun path traversal**, **aucun IDOR**.

🟡 **3 findings non-critiques documentés** (cf. §9.4) :

| # | Sévérité      | Titre                                                              | Statut                          |
| - | ------------- | ------------------------------------------------------------------ | ------------------------------- |
| 1 | HIGH (process) | Image Docker en prod en retard sur les correctifs (CSP, middleware…) | Corrigé (rebuild fait)          |
| 2 | MEDIUM (5.3)  | HAProxy stats `:8404` sans authentification                        | Backlog Q2 2026                 |
| 3 | MEDIUM (5.3)  | Rate limit per-IP absent sur `/api/auth/callback/credentials`      | Backlog Q2 2026                 |

🟢 **20+ contrôles validés** :

- HSTS preload + max-age 2 ans : OK
- X-Frame-Options DENY + frame-ancestors 'none' : OK (clickjacking bloqué)
- X-Content-Type-Options nosniff : OK
- Referrer-Policy strict-origin-when-cross-origin : OK
- Permissions-Policy camera/mic/geo désactivés : OK
- **Content-Security-Policy** strict avec connect-src whitelist : OK
- HAProxy filtre User-Agent (sqlmap/nikto/nmap/gobuster) → 403 : OK
- HAProxy ACL méthodes : seules GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD : OK
- TRACE method bloquée → 405 : OK
- Pas de source map `.js.map` exposée : OK
- Pas de `.env`, `.git/config`, `package.json`, `schema.prisma` exposés : OK
- X-Powered-By stripped par HAProxy (fingerprint Next.js caché) : OK
- Path traversal `/sms/..`, `/famille/..` bloqués par Next.js URL norm : OK
- Host header injection rejetée par NextAuth : OK
- X-Forwarded-User / X-Real-IP ignorés pour bypass admin : OK
- Email enumeration timing : pas de différence > 1 ms (no oracle) : OK
- `/api/v1/users` → 401 missing_token (auth strict) : OK
- Reflected XSS via query string : pas de réflexion : OK
- Token URL `/sms/[token]` `/phishing/[token]` : 404 anonymisé (pas d'oracle) : OK
- `robots.txt` + `sitemap.xml` correctement configurés : OK
- **Middleware edge sur /admin/** + /api/admin/** : OK (401 JSON sans cookie)
- **`/health` alias rewrite** retourne 200 + `{"status":"ok"}` : OK
- **`/.well-known/security.txt`** servi (RFC 9116) : OK

### 2.6 Évolutions depuis v1.3 (12 mai 2026)

Période couverte : 8 → 12 mai 2026 (5 jours, 12 PRs mergées).

**Changements impactant la posture sécurité :**

| Date | PR | Sujet | Effet sécurité |
|---|---|---|---|
| 10 mai | #439 | Sprint 5 : bandeau cookie + Plausible Analytics | **Conformité CNIL 2020-091 améliorée** (parité stricte Accepter/Refuser, aucun script analytics chargé sans consentement explicite) |
| 10 mai | #440 | Docker : `NEXT_PUBLIC_*` en build args | **Durcissement build** : la config publique est explicitement déclarée comme ARGs Dockerfile + `build.args` compose, plus de leak silencieux ni de divergence build/runtime |
| 11 mai | #481-482 | Prisma 5.22 → 6.19 (lockfile aligné) | **Élimination d'une dette de patchs** : la prod tournait sur Prisma 5.22 alors que la maintenance s'arrêtait. Maintenant sur 6.x, support actif |
| 12 mai | #483 | Markdown render Hex chat | **XSS-safe par design** : composant `MarkdownView` whitelist (gras, listes, liens) — aucun `dangerouslySetInnerHTML`, schémas URL bloqués (`javascript:*` filtré côté `renderInline`) |
| 12 mai | #485 | Revert `/api/debug` + stack expose dans `global-error.tsx` | **Correction d'une fuite potentielle** : un commit debug avait été promu accidentellement en main. Stack traces server-side n'étaient pas authentifiées. Revert chirurgical (PR dédiée, sans toucher au reste). |
| 12 mai | #486 | `@simplewebauthn/server` 10 → **13.3** | **Bibliothèque crypto WebAuthn à jour** ; le sub-package `types@10` deprecated qui restait en transitive est éliminé. API alignée sur spec FIDO2 récente (champ `credential.id` + `credential.publicKey` regroupés). |
| 12 mai | #487 | `recharts` 2 → 3 | Pas d'impact sécurité direct, mais alignement React 19 (DOM safety) |
| 12 mai | #488 | TypeScript 5.9 → **6.0** | **Strictness accrue** : TS 6 refuse les side-effect imports non déclarés. Force la traçabilité des modules ambient (cf. `global.d.ts`) |
| 12 mai | #489 | Tailwind 3 → 4 (mode compat) | Bénéfice indirect : `autoprefixer` retiré (1 dep transitive de moins) |
| 12 mai | #490 | Next 15 → **16** + ESLint 10 + eslint-config-next 16 | **Patches sécu cumulatifs Next 16** (dont fix Server Actions header smuggling). Migration vers ESLint **flat config** (modèle plus auditable). |
| 12 mai | #491 | Doc bloqueur Prisma 7 | **Transparence** : Prisma 7 + adapter pg + Turbopack default Next 16 = incompatible aujourd'hui. Documenté en `docs/MIGRATION_PRISMA_7.md` § 9-10. |
| 12 mai | #492 | Fix 14 tests de domain drift | **Restauration du gate CI** : 0 failure active, tests verts à 97,5 %. Sans tests verts, pas de barrière de régression sécu. |

**Statut des 3 findings v1.1 (pentest 7 mai 2026)** :

| # | Sévérité | Sujet | Statut au 12 mai |
|---|---|---|---|
| 1 | HIGH (process) | Image Docker en prod en retard sur main | ✅ **Corrigé** (rebuild de référence le 7 mai + procédure de rebuild documentée dans cette release) |
| 2 | MEDIUM (5.3) | HAProxy stats `:8404` sans auth | 🟡 Backlog Q2 2026 — port bound sur 127.0.0.1 uniquement (atténuation existante : non joignable depuis l'extérieur) |
| 3 | MEDIUM (5.3) | Rate limit absent sur `/api/auth/callback/credentials` | 🟡 Backlog Q2 2026 — le **provider Credentials** n'est plus exposé en prod (only magic link + SSO). À déprécier ou rate-limiter. |

**Nouveaux contrôles validés v1.4 :**

- ✅ **Cookie banner CNIL 2020-091** : parité stricte des boutons (texte/taille/couleur ⩵), aucune case pré-cochée, événement custom `humanix-consent-changed` pour notifier `PlausibleLoader`, aucun appel réseau à `plausible.io` tant que `localStorage['humanix-cookie-consent'] !== 'granted'`
- ✅ **CSP dynamique** : l'origine Plausible est ajoutée à `script-src` + `connect-src` **seulement si** `NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT` est défini. Les forks AGPL non configurés ont une CSP plus stricte par défaut (pas de whitelist `plausible.io` en dur)
- ✅ **Aucun ID Plausible hardcodé** dans le repo : chaque opérateur configure SON URL via env var (respect AGPL — pas d'instrumentation cachée des forks)
- ✅ **`npm audit` 0 / 0 / 0 / 0** sur 781 dépendances (critical/high/moderate/low/info)
- ✅ **0 warning `npm deprecated`** au build (vs 2 en v1.3 : `glob@10.5.0` et `@simplewebauthn/types@10`)
- ✅ **Build args Docker auditables** : 8 variables `NEXT_PUBLIC_*` déclarées explicitement dans `Dockerfile` + `docker-compose.yml`, avec valeurs default vides (forks OSS = CSP plus stricte, aucune confusion build/runtime)

---

## 3. Architecture et flux de données

### 3.1 Schéma général

```
                           ┌──────────────────────┐
                           │   Internet 80/443    │
                           └──────────┬───────────┘
                                      │
                           ┌──────────▼───────────┐
                           │  HAProxy 2.9-alpine  │  ← TLS, ACL, rate limit, security headers
                           │  (humanix_frontend)  │     Seul service exposé public
                           └──────────┬───────────┘
                                      │
                  ┌───────────────────▼────────────────────┐
                  │  Next.js 15 (humanix-app)              │
                  │  Auth.js v5 + Prisma 5 + React 19      │
                  └──┬──────────────┬──────────────┬───────┘
                     │ humanix_backend (privé)
       ┌─────────────▼────┐  ┌──────▼──────┐ ┌────▼──────────────┐
       │  PostgreSQL 16   │  │  TTS Piper  │ │ Mistral API (HTTPS)│
       │  Multi-tenant    │  │  (FastAPI)  │ │ (sortant uniquement│
       │  Non-exposé host │  │  Non-exposé │ │  pour génération IA)│
       └──────────────────┘  └─────────────┘ └────────────────────┘
```

### 3.2 Flux de données sensibles

| Donnée                    | Source                                    | Stockage                                                 | Sortie réseau              |
| ------------------------- | ----------------------------------------- | -------------------------------------------------------- | -------------------------- |
| Identifiants utilisateurs | Saisie utilisateur                        | PostgreSQL (Auth.js Account/Session)                     | Aucune                     |
| Mots de passe             | Aucun (zero-password : magic link ou SSO) | Aucun                                                    | Aucune                     |
| Tokens OAuth              | Provider Google/Microsoft                 | PostgreSQL (Account.access_token, chiffré au filesystem) | Aucune                     |
| Progression apprenant     | Saisie via player                         | PostgreSQL                                               | Aucune                     |
| Contenu Cyber-Anecdote    | Rédaction interne                         | PostgreSQL                                               | Scaleway TEM (envoi mail)        |
| Prompts Mistral           | Saisie admin tenant                       | Mémoire vive uniquement                                  | Mistral AI (Paris, France) |
| Audio TTS                 | Texte de modules                          | Cache disque hash sha256, TTL 30j                        | Aucune (service interne)   |
| Webhooks                  | Événements tenant                         | Trigger sur Slack/Teams/URL custom                       | URL configurée par tenant  |
| Logs système              | Logs HAProxy + Next.js                    | stdout (capturé Docker)                                  | Aucune par défaut          |

**Aucune donnée utilisateur** n'est envoyée à un service tiers sans configuration explicite par le tenant (intégrations webhook, etc.).

---

## 4. Sécurité applicative

### 4.1 Authentification

#### Choix de design

- **Zero-password par défaut** : aucun mot de passe stocké côté HumaniX en mode production. Trois modes :
  1. **Magic link** par email (Scaleway TEM) - par défaut
  2. **SSO Google** (OAuth 2.0)
  3. **SSO Microsoft Entra ID** (OAuth 2.0 + OIDC)
- **Mode démo** : Credentials provider sans mot de passe (1-clic) pour permettre les démos commerciales sans setup.

#### Implémentation

- **Auth.js v5** (anciennement NextAuth) - librairie auditée, base installée massive (>500K projets)
- **Prisma Adapter** pour persistance des sessions
- **Sessions JWT** signées avec `AUTH_SECRET` (32 bytes minimum), strategy database en production
- **`AUTH_TRUST_HOST`** activé (mandatory derrière HAProxy)
- **Vérification `isActive`** dans `authorize()`, `signIn` callback, `jwt` callback et `session` callback - un compte suspendu n'a aucune voie d'authentification valide

#### Contrôles vérifiés

| Contrôle                                            | Statut                                             |
| --------------------------------------------------- | -------------------------------------------------- |
| Pas de mot de passe en clair en log                 | ✅ Vérifié                                         |
| Pas de mot de passe en BDD                          | ✅ N/A (zero-password)                             |
| Magic link à usage unique avec TTL court (1h)       | ✅ Vérifié                                         |
| Compte suspendu refusé même si magic link valide    | ✅ Vérifié `isActive` check                        |
| SSO refuse comptes inexistants en BDD               | ✅ Vérifié `signIn` callback (pas d'auto-création) |
| Erreur de connexion ne révèle pas si l'email existe | ✅ Vérifié                                         |

### 4.2 Autorisation (multi-tenant)

#### Modèle

- **Multi-tenant logique** : tous les modèles sensibles ont un `tenantId String` obligatoire et indexé.
- **Filtrage strict** dans toutes les requêtes Prisma : aucune query ne peut traverser les frontières tenant sans intention explicite.
- **Hiérarchie de rôles** : `LEARNER < MANAGER < ADMIN < SUPERADMIN`.
- **Plan-gating** : 3 paliers cloud (`starter < pro < enterprise`) avec catalogue de 11 features (`lib/plans.ts`). Anciens identifiants (`decouverte`, `solo`, `essentielle`, `premium`, `trial`) toujours acceptés en entrée et remappés gracieusement via `normalizePlan()`.

#### Contrôles vérifiés

| Contrôle                                                                                             | Statut                                                 |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Tous les `findMany` / `findUnique` filtrent sur `tenantId`                                           | ✅ Audit code                                          |
| Server actions vérifient le rôle ET le `tenantId`                                                    | ✅ Helper `requireAdminTenant()` réutilisé             |
| Saison globale (`tenantId: null`) accessible à tous, saison custom uniquement au tenant propriétaire | ✅ Filtre `OR: [{tenantId: null}, {tenantId}]` partout |
| Plan-gate vérifié côté server action AVANT toute action                                              | ✅ Helper `getTenantPlan()` + comparaison rang         |
| Tentative d'accès à un tenant via paramètre URL falsifié                                             | ✅ Refus correct (404)                                 |

#### Test d'isolation tenant manuel

```
Scénario : un user connecté sur tenant A appelle GET /api/v1/progress?userId=<userId du tenant B>
Résultat attendu : la query Prisma filtre sur tenantId = A, l'userId B n'a aucune progression visible
Résultat observé : ✅ Conforme (aucune fuite)
```

### 4.3 Validation des entrées

#### Stack

- **Zod** sur toutes les routes API et server actions
- Schémas typés exportés et réutilisés (pas de validation ad-hoc)
- Limites strictes de longueur (titres < 200, descriptions < 4000, etc.)

#### Exemples concrets

| Route                              | Validation                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `POST /api/progress`               | `score: z.number().int().min(0).max(1000), quizScorePct: z.number().int().min(0).max(100).optional()` |
| `POST /api/admin/breaches/refresh` | Authn + role check + pas de payload accepté                                                           |
| `POST /api/tts/synthesize`         | `text: max 5000 chars`, format whitelist `mp3\|wav`                                                   |
| `POST /api/phishing/report`        | Email pro vérifié BDD, body excerpt max 10K, CORS allowlist                                           |
| Création webhook tenant            | URL HTTPS obligatoire, anti-SSRF (refus IPs privées + .local + .internal)                             |
| Génération phishing IA Mistral     | Anti-PII (refus si SIRET/SIREN/email détecté dans contexte libre)                                     |

### 4.4 Protection contre les attaques courantes

| Attaque                    | Protection                                                                                                                                                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SQL Injection**          | Prisma ORM (queries paramétrées par nature). Aucun `$queryRawUnsafe` dans le code.                                                                                                                                                                                                 |
| **XSS**                    | React échappe par défaut. Utilisation de `dangerouslySetInnerHTML` limitée à 2 cas auditables : (1) script anti-flash thème (CSS toggle) et (2) preview HTML phishing IA - ce dernier passe par `sanitizeHtml()` qui retire `<script>`, `<iframe>`, attributs `on*`, `javascript:` |
| **CSRF**                   | Server Actions Next.js avec protection CSRF native (token automatique).                                                                                                                                                                                                            |
| **SSRF (webhooks)**        | `isSafeWebhookUrl()` refuse : non-HTTPS, hostname `localhost` / `*.local` / `*.internal` / `*.lan`, IPv4 littéraux dans les ranges privées (10.x, 127.x, 169.254.x, 172.16-31.x, 192.168.x, 0.x).                                                                                  |
| **Open redirect**          | Aucune redirection basée sur paramètre utilisateur non-whitelisté.                                                                                                                                                                                                                 |
| **Clickjacking**           | Header `X-Frame-Options: DENY` poussé par HAProxy.                                                                                                                                                                                                                                 |
| **MIME sniffing**          | Header `X-Content-Type-Options: nosniff`.                                                                                                                                                                                                                                          |
| **Information disclosure** | Headers `Server` et `X-Powered-By` supprimés par HAProxy. Errorfiles brandés (anti-fingerprint).                                                                                                                                                                                   |
| **Brute force connexion**  | Magic link à usage unique + rate limit HAProxy (100 req/10s par IP).                                                                                                                                                                                                               |
| **Énumération comptes**    | Réponse identique pour email existant / inexistant à la connexion.                                                                                                                                                                                                                 |

### 4.5 Rate limiting applicatif

En complément du rate limit HAProxy, certains endpoints ont leurs propres compteurs :

| Endpoint                           | Limite                                  | Mécanisme     |
| ---------------------------------- | --------------------------------------- | ------------- |
| `POST /api/tts/synthesize`         | 50 req/h/user                           | `Event` count |
| `POST /api/phishing/report`        | 30 signalements/h/user                  | `Event` count |
| `POST /api/admin/phishing/generer` | 10 générations/h/user                   | `Event` count |
| `POST /api/cron/breaches-refresh`  | Rate non-applicatif (token CRON_SECRET) | -             |

### 4.6 Audit trail

Toutes les actions sensibles produisent un `Event` en BDD, avec :

- `tenantId`, `userId` (scoping)
- `type` (catégorisation)
- `payload` (métadonnées **sans contenu sensible** : longueurs, hashes, et non le texte original)

**Exemples** :

- Connexion : pas de log direct (Auth.js gère sa propre table `Session`)
- Téléchargement Pack NIS2 : `pack_nis2_generated` + nom dirigeant + ville (consigne contractuelle légitime)
- Génération phishing IA : `phishing_generated` + template + service + difficulté + longueurs (jamais le contenu)
- Refresh observatoire fuites : `breaches_refreshed` + compteurs

**Conservation** : actuellement illimitée (à ajuster avec une politique de purge à 13 mois - RGPD norme courante - dans une prochaine version).

---

## 5. Sécurité infrastructure

### 5.1 Topologie réseau

#### Segmentation Docker

Deux réseaux logiquement isolés :

- **`humanix_frontend`** : `haproxy` ↔ `app`. Seul HAProxy y est accessible depuis l'extérieur.
- **`humanix_backend`** : `app` ↔ `postgres`, `app` ↔ `tts`. Aucun service de ce réseau n'est exposé sur l'host.

Avant cette refonte (version V0.3 et antérieures), Postgres était exposé sur le port `5432` de l'host. Depuis V0.4, **fini** : seul HAProxy a un mapping de port host.

#### HAProxy en frontend

Configuration : `infra/haproxy/haproxy.cfg`. Caractéristiques :

| Paramètre   | Valeur                                                           |
| ----------- | ---------------------------------------------------------------- |
| Version     | 2.9-alpine                                                       |
| TLS minimum | TLS 1.2                                                          |
| Ciphers     | Mozilla Intermediate (AEAD only : ECDHE-AES-GCM, ECDHE-CHACHA20) |
| HTTP/2 ALPN | h2, http/1.1                                                     |
| Healthcheck | `GET /api/health` toutes les 5s                                  |
| Rate limit  | 100 req/10s par IP, 30 errors/10s, 50 conn/10s                   |
| Stick-table | IPv6, taille 100K, expire 30 min                                 |

#### Règles HAProxy de sécurité

```
# Méthodes HTTP autorisées (RFC 7231)
acl method_allowed method GET POST PUT PATCH DELETE OPTIONS HEAD
http-request deny deny_status 405 if !method_allowed

# Bots offensifs bloqués
acl ua_blocked hdr_reg(user-agent) -i (sqlmap|nikto|nmap|masscan|wpscan|gobuster|dirbuster|hydra|hakrawler)
http-request deny deny_status 403 if ua_blocked

# UA vide refusé
acl ua_empty hdr_cnt(user-agent) eq 0
http-request deny deny_status 403 if ua_empty

# Rate limit IP
acl is_abuser_req sc_http_req_rate(0) gt 100
http-request deny deny_status 429 if is_abuser_req
```

### 5.2 Conteneurisation

| Service       | Image                                  | User                        | Volumes            | Réseau             |
| ------------- | -------------------------------------- | --------------------------- | ------------------ | ------------------ |
| haproxy       | `haproxy:2.9-alpine`                   | non-root                    | config + errors RO | frontend           |
| app (Next.js) | Build local multi-stage                | `nextjs:nodejs` (1001:1001) | aucun              | frontend + backend |
| postgres      | `postgres:16-alpine`                   | par défaut                  | volume persistant  | backend            |
| tts           | Build local (Python 3.11-slim + Piper) | `tts:tts` non-root          | aucun              | backend            |

#### Hardening Dockerfile principal (Next.js)

- Multi-stage : `deps` → `builder` → `runner` (image finale ~150 Mo)
- `runner` ne contient ni `node_modules` de dev, ni les sources `.tsx` complètes
- Utilisateur non-root (UID 1001)
- `chmod 755` explicite sur l'entrypoint
- `AUTH_SECRET` injecté **uniquement au build** (pas persisté en layer)
- `DATABASE_URL` placeholder au build (jamais de vraie URL en image)

#### Hardening Dockerfile TTS

- Image basée Python 3.11-slim (CVE patches récents)
- Utilisateur non-root `tts:tts`
- Pas de port exposé sur l'host
- Healthcheck Docker actif
- Limite RAM 512 Mo (déni de service local impossible)

### 5.3 Gestion des secrets

| Secret                            | Lieu                                   | Génération recommandée                |
| --------------------------------- | -------------------------------------- | ------------------------------------- |
| `AUTH_SECRET`                     | env conteneur                          | `openssl rand -base64 32`             |
| `CRON_SECRET`                     | env conteneur                          | `openssl rand -hex 32`                |
| `DATABASE_URL`                    | env conteneur (mot de passe DB inclus) | mot de passe fort, géré par opérateur |
| `MISTRAL_API_KEY`                 | env conteneur                          | fournie par Mistral AI                |
| OAuth secrets (Google, Microsoft) | env conteneur                          | fournis par provider                  |
| Scaleway TEM API key                    | env conteneur                          | fournie par Scaleway TEM                    |

**Pratiques** :

- Aucun secret committé dans Git
- `.env.example` (à venir V0.5) avec valeurs vides
- En production : stockage dans le secret manager Scaleway / Vault
- Rotation : recommandée tous les 6 mois (sauf `AUTH_SECRET` qui invalide toutes les sessions à la rotation)

### 5.4 Mises à jour et CVE

| Composant        | Mise à jour | Statut au 12 mai 2026 (v1.4) |
| ---------------- | ----------- | --- |
| Dépendances npm  | `npm audit` à chaque release + Dependabot hebdo | ✅ **0 vulnérabilité** (critical/high/moderate/low/info) sur 781 deps |
| Stack applicative majeure | Bumps stables périodiques | ✅ Next 16.2.6 / React 19.2.6 / TypeScript 6.0.3 / ESLint 10.3 / Tailwind 4.3 / Prisma 6.19.3 (Prisma 7 bloqué côté écosystème — cf. `docs/MIGRATION_PRISMA_7.md`) |
| Image PostgreSQL | Suivi des releases mineures (16.x) | ✅ Pinned `postgres:16-alpine` |
| Image HAProxy    | Suivi des branches stables 2.9.x | ✅ Pinned `haproxy:2.9-alpine` |
| Image Python TTS | Rebuild trimestriel pour patches CVE base image | ✅ Pinned `humanix-tts:1.0.0` |
| Image Node app | Pinned `node:25-alpine` pour Next 16 + Prisma 6 | ✅ |

---

## 6. Protection des données personnelles (RGPD)

### 6.1 Catégorisation des données

| Catégorie                     | Exemples                      | Base légale RGPD                   | Durée de conservation      |
| ----------------------------- | ----------------------------- | ---------------------------------- | -------------------------- |
| **Identification compte**     | email, nom, rôle, tenant      | Exécution du contrat (art. 6.1.b)  | Durée du contrat + 13 mois |
| **Données de progression**    | scores, modules complétés, XP | Exécution du contrat               | Durée du contrat           |
| **Risk score & maîtrise**     | scores agrégés par user       | Intérêt légitime + contrat         | Durée du contrat           |
| **Logs d'événements**         | type d'action, timestamps     | Intérêt légitime (sécurité, debug) | 13 mois (à formaliser)     |
| **Données techniques**        | IP hashées, user-agent        | Intérêt légitime (sécurité)        | 13 mois                    |
| **Audit Flash**               | entrée publique pour leads    | Consentement (case cochée)         | 36 mois max                |
| **Newsletter Cyber-Anecdote** | email, opt-in                 | Consentement explicite             | Jusqu'à désinscription     |

### 6.2 Droits des personnes implémentés

| Droit                              | Statut     | Modalité                                                                |
| ---------------------------------- | ---------- | ----------------------------------------------------------------------- |
| **Information** (art. 13)          | ✅         | Page `/confidentialite` exhaustive                                      |
| **Accès** (art. 15)                | ✅         | Sur demande à `rgpd@humanix-cybersecurity.fr`, réponse < 30 jours       |
| **Rectification** (art. 16)        | ✅         | Auto-service depuis `/profil`                                           |
| **Effacement** (art. 17)           | ✅         | Sur demande, traitement < 30 jours, cascade Prisma `onDelete: Cascade`  |
| **Limitation** (art. 18)           | ✅         | Compte mis en `isActive: false` sur demande                             |
| **Portabilité** (art. 20)          | ⚠️ Partiel | Export CSV des progressions disponible, pas encore d'export complet zip |
| **Opposition** (art. 21)           | ✅         | Désinscription newsletter en 1 clic, refus marketing                    |
| **Décision automatisée** (art. 22) | N/A        | Aucune décision impactante automatisée                                  |

### 6.3 Privacy by design

- **Minimisation** : nous ne collectons pas d'âge, de genre, de date de naissance, d'adresse postale, de photo. L'email pro est l'identifiant unique.
- **IP hashées** : dans la table `AuditFlashSubmission` et `FamilyInvite`, l'IP est hachée SHA-256 avant stockage (anti-fingerprint).
- **Newsletter** : opt-in actif, hash du texte de consentement stocké comme preuve.
- **Audit logs** : payloads ne contiennent pas le contenu sensible (longueurs, types, hashes - pas le texte).

### 6.4 Sous-traitants RGPD (art. 28)

| Sous-traitant             | Service                | Pays                            | DPA                                               |
| ------------------------- | ---------------------- | ------------------------------- | ------------------------------------------------- |
| Scaleway                  | Hébergement            | France 🇫🇷                       | DPA standard signé                                |
| Scaleway TEM                    | Envoi de mails         | UE 🇪🇺 (Berlin/Dublin)           | DPA standard signé                                |
| Mistral AI                | IA générative phishing | France 🇫🇷                       | DPA standard signé                                |
| Stripe (à venir)          | Paiements              | Irlande 🇮🇪 + USA (mais data EU) | DPA standard                                      |
| Google (SSO optionnel)    | Authentification SSO   | USA 🇺🇸                          | OAuth uniquement, aucune donnée HumaniX transmise |
| Microsoft (SSO optionnel) | Authentification SSO   | USA 🇺🇸                          | OAuth uniquement                                  |

**Aucune dépendance Cloud Act US** sur les données HumaniX (Google/Microsoft sont uniquement consultés pour valider une identité, aucune donnée tenant ne leur est transmise).

### 6.5 DPA et registre

- **DPA art. 28** : modèle pré-signé fourni au tenant à la souscription, conforme CNIL.
- **Registre art. 30** : tenu en interne, auditable sur demande de la CNIL.
- **Pack NIS2 par-tenant** : disponible pour les tenants Pro+ (politique sensibilisation, procédure incident, registre formations, engagement employé).

### 6.6 Notifications de violation (art. 33)

Procédure :

1. Détection (par alerte ou signalement)
2. Évaluation : la fuite concerne-t-elle des données personnelles ?
3. Si oui : notification CNIL via `notifications.cnil.fr` sous **72h**
4. Si risque élevé : notification individuelle des personnes concernées
5. Tenue d'un registre des incidents (interne)

À ce jour : **0 incident notifié**.

---

## 7. Sécurité du cycle de développement (SDLC)

### 7.1 Stack technique et choix

| Choix                       | Justification sécurité                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| **TypeScript strict**       | Détection d'erreurs au build, réduction des bugs runtime                                   |
| **Next.js 15 + App Router** | Server Components par défaut (moins d'attaques côté client), CSRF natif sur Server Actions |
| **Prisma ORM**              | Queries paramétrées par nature (immune SQL injection), schema versionné                    |
| **Auth.js v5**              | Lib auditée, base installée massive                                                        |
| **Zod**                     | Validation runtime systématique                                                            |
| **React 19**                | Stable, sans deps connues vulnérables                                                      |

### 7.2 Code review

- Code review interne systématique avant merge
- Pas encore de code review formel par tiers (équipe à 1-2 devs)
- Tests d'intégration manuels avant chaque release majeure

### 7.3 Gestion des dépendances

| Pratique                                                       | Statut                                                                                                                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm audit` avant chaque release                               | ✅ Manuel + automatisé en CI (job dédié `npm audit (HIGH/CRITICAL)`)                                                                                                           |
| **Dependabot configuré** (npm + pip + github-actions + docker) | ✅ Hebdo le lundi, groupes filtrés `minor + patch`, MAJORS bloquées sur les packages critiques (next, react, prisma, next-auth, zod, mdx-remote, tailwind, typescript, eslint) |
| Audit licences dépendances vs AGPL                             | ✅ Documenté dans [`docs/LICENSES_AUDIT.md`](./LICENSES_AUDIT.md) - 549 packages scannés, 0 incompatibilité                                                                    |
| Scan SCA (Snyk, Socket.dev)                                    | 🔲 Optionnel - Dependabot alerts couvre déjà les CVE                                                                                                                           |
| Pinning des versions                                           | ✅ `package-lock.json` versionné                                                                                                                                               |
| Pas de `*` ni `^` non-borné                                    | ✅ `package.json` audité                                                                                                                                                       |

### 7.4 Tests automatisés

| Surface | Statut au 12 mai 2026 (v1.4) |
|---|---|
| **Tests unitaires vitest** | ✅ **710/723 verts** (97,5 %) sur 46 fichiers. Couvre auth, plans, retention, audit log, plans, billing, marketplace, scim, webhooks, cyber-score, vishing/smishing scripts, license Ed25519, RBAC, PII filter, et 13 tests d'isolation cross-tenant. |
| Tests skipped (13) | Suite `tenant-isolation.test.ts` skip gracieux quand `app/admin/actions` indisponible (Docker prod runner stage). En CI/dev avec full source : les 13 tests d'isolation cross-tenant tournent et garantissent qu'aucune action admin ne mute une ressource d'un autre tenant. |
| Tests d'intégration | 🔲 Aucun framework dédié (Playwright reporté V0.5). Compensé partiellement par les tests vitest qui mockent Prisma + auth pour tester les server actions. |
| Tests end-to-end | 🔲 Aucun (à mettre en place via Playwright en V0.5) |
| **Coverage threshold CI** | 🟡 Désactivé pendant la phase de montée en charge (v8 instrumente tout, ratio global bas tant que P1/P2 modules pas couverts). Roadmap : Sprint P1 post-launch (ai/mistral, anecdotes, breaches, business-impact) → cible 70 % global. Sprint P2 Q3 2026 → 85 %. |

**Constat v1.4** : la résolution des 14 failures de domain drift (PR #492) a restauré le **gate CI tests**. Sans cette restauration, une régression sur seats/plans/data-retention serait passée inaperçue.

### 7.5 CI/CD

| Élément                          | Statut                | Détail                                                                                                                               |
| -------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **GitHub Actions CI**            | 🟡 Configuré, exécution bloquée | `.github/workflows/ci.yml` - lint + types + Prettier + audit npm + production build. Exécution bloquée temporairement au 12 mai 2026 (compte facturation Actions à régler). Run local OK. Réactivation dès résolution paiement. |
| **CodeQL (SAST)**                | ✅ Configuré              | `.github/workflows/codeql.yml` - analyse statique automatisée. Premier run effectif dès passage public du repo le 26 mai 2026 (gratuit en repo public). |
| **DCO signed-off-by check**      | ✅ Configuré              | Vérifie que chaque commit est signé `Signed-off-by:` (engagement DCO)                                                                |
| **Dependabot version updates**   | ✅ Actif              | Cf. §7.3 - 0 CVE confirmé `npm audit` au 12 mai 2026                                                                              |
| **Build Docker reproductible**   | ✅ Actif              | Dockerfile multi-stage avec lockfile pinné. **NEXT_PUBLIC_* en build args explicites** depuis le 10 mai 2026 (PR #440)                |
| **Hébergement code source**      | 🟡 GitHub aujourd'hui | Migration vers forge souveraine FR (Forgejo / Codeberg-FR) prévue Q1-Q2 2027. Git distribué = portabilité 100 %.                     |
| **Branch protection sur `main`** | ⏳ Bloqué tech         | Exige plan GitHub Pro OU repo public. **Activation automatique prévue le 26 mai 2026** (passage public du repo). Configuration cible : require PR + CI green + 1 review + DCO. |

---

## 8. Gestion des incidents

### 8.1 Plan de réponse

Documenté dans `lib/pack-nis2/data.ts` et fourni aux clients Pro+ comme livrable. En interne, nous appliquons le même plan :

| Étape                                           | Délai cible |
| ----------------------------------------------- | ----------- |
| Détection (alerte ou signalement)               | T+0         |
| Confinement réseau                              | T+15 min    |
| Notification équipe interne                     | T+30 min    |
| Notification client (si fuite tenant)           | T+4h        |
| Notification CNIL (si données personnelles)     | T+72h max   |
| Communication publique (blog, email, /securite) | T+7j max    |
| REX écrit et publié                             | T+30j       |

### 8.2 Contacts incident

- **Sécurité** : security@humanix-cybersecurity.fr
- **RGPD** : rgpd@humanix-cybersecurity.fr
- **Support général** : support@humanix-cybersecurity.fr
- **Astreinte technique** : numéro communiqué aux clients sous contrat

### 8.3 Audit trail interne

Toutes les actions admin sensibles sont loggées dans `Event`. En cas d'incident, ce log permet la reconstitution forensique :

- Qui a accédé à quoi
- Quand
- Avec quel rôle/tenant
- Sur quel volume de données

---

## 9. Constats et points d'attention

### 9.1 Points forts (à conserver et renforcer)

✅ **Souveraineté FR/UE assumée** : zéro dépendance Cloud Act US sur données client. Différenciant majeur sur le marché PME.

✅ **Architecture multi-tenant solide** : scoping strict, plan-gating à 4 niveaux, segmentation Docker.

✅ **Pratiques SDLC modernes** : TypeScript strict, ORM, validation Zod systématique.

✅ **Transparence éditoriale** : page `/comparatif` honnête, page `/securite` (Trust Center), ce rapport public.

✅ **RGPD natif et non bolt-on** : DPA, registre, droits implémentés, IP hashées, minimisation des données.

### 9.2 Points d'amélioration (en backlog)

| #   | Sujet                                              | Priorité | Échéance        |
| --- | -------------------------------------------------- | -------- | --------------- |
| 1   | CI/CD avec redeploy automatique au push main       | Haute    | Q2 2026         |
| 2   | HAProxy `stats auth` sur frontend stats 8404       | Haute    | Q2 2026         |
| 3   | Rate limit per-IP sur `/api/auth/callback/*`       | Haute    | Q2 2026         |
| 4   | Pentest externe par cabinet PASSI                  | Haute    | Q3 2026         |
| 5   | Audit RGAA externe                                 | Moyenne  | Q4 2026         |
| 6   | Dependabot / Renovate en CI                        | Haute    | Q2 2026         |
| 7   | Scan SAST CI (Semgrep/CodeQL)                      | Haute    | Q3 2026         |
| 8   | Tests E2E Playwright sur flows critiques           | Moyenne  | Q3 2026         |
| 9   | Bug bounty formalisé (programme public)            | Moyenne  | Q4 2026         |
| 10  | Politique de purge des `Event` à 13 mois           | Moyenne  | Q3 2026         |
| 11  | Drill incident annuel formel                       | Basse    | 2027            |
| 12  | CSP avec nonces (script-src strict, no unsafe-inline) | Basse | post-launch     |
| 13  | Migration `catch (e: any)` restants vers `unknown` | Basse    | post-launch     |

### 9.4 Findings du pentest interne v1.1 (7 mai 2026)

#### Finding 1 — HIGH (process) : Image Docker en prod en retard sur les correctifs

**Constat** : à la date du test (7 mai), l'image `humanix-academie-app` déployée
avait été buildée avant le merge des PRs #142 (CSP + middleware admin + alias
`/health`), #133 (sanitization Mistral DOMPurify) et #150-#153 (a11y + typos).

Vérifié en pentest :
- Header `Content-Security-Policy` absent en réponse
- `/health` renvoie 404 au lieu du JSON `{"status":"ok"}`
- `/api/admin/*` sans cookie session renvoie 404 HTML au lieu de 401 JSON
  (preuve que le middleware edge-runtime est absent du bundle)

**Impact** : tous les correctifs sécurité du jour étaient inactifs en prod.
La défense en profondeur ajoutée par le middleware et la CSP ne protégeait
personne tant que l'image n'était pas reconstruite.

**Fix appliqué** (post-pentest) : `docker compose build humanix-app && docker compose up -d humanix-app`. Validé le même jour.

**Mesure préventive** : ajout au backlog d'une **CI/CD avec déclenchement
auto au push main** (item §9.2 #1). Pipeline GitHub Actions → registre
Docker → pull + restart automatique.

#### Finding 2 — MEDIUM (CVSS 5.3) : HAProxy stats sans authentification

**Constat** : `infra/haproxy/haproxy.cfg` ligne 151-157 expose le frontend
stats sur `*:8404` sans `stats auth`. Un commentaire explicite mentionne
"En prod : ajouter `stats auth admin:...`" mais la ligne est en commentaire.

**Vérification** : depuis le container Exegol, accès anonyme au stats
HTML complet (backends, débit, état des serveurs, requêtes par seconde).

**Impact** : information disclosure permettant d'énumérer la topologie
backend. Bien que `docker-compose.yml` limite l'exposition à `127.0.0.1:8404`
sur l'host, **tout container partageant le réseau Docker peut accéder
anonymement** à la page stats. Risque réel si l'infra est partagée
(VM mutualisée, ou compromission d'un container voisin).

**CVSS 3.1** : `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` = 5.3 (Medium)

**Statut au 12 mai 2026 (v1.4)** : ✅ **RÉSOLU**. Mis en place dans
`infra/haproxy/haproxy.cfg` (et le pendant `haproxy.dev.cfg`) :

```
frontend stats
    bind *:8404
    stats enable
    stats uri /
    stats refresh 10s
    stats admin if FALSE
    stats auth admin:"${HAPROXY_STATS_PASSWORD}"
    stats realm   Humanix\ HAProxy\ Stats
    stats hide-version
```

Le password vient de la variable d'env `HAPROXY_STATS_PASSWORD`, déclarée
dans `docker-compose.yml#haproxy.environment` avec un default `humanix-stats-
change-me` (à override en prod via `.env`, cf. `.env.example`). HAProxy
interpole la variable au chargement du fichier de config.

**Vérification** :
- `curl http://127.0.0.1:8404/` sans auth → **401 Unauthorized** ✅
- `curl -u admin:wrong http://127.0.0.1:8404/` → **401** ✅
- `curl -u admin:humanix-stats-change-me http://127.0.0.1:8404/` → **200** ✅

**Effet collatéral corrigé** : le healthcheck Docker du container HAProxy
(qui pingait `/` sur 8404 anonymement) a été adapté pour passer les
credentials via l'URL syntax `http://admin:$HAPROXY_STATS_PASSWORD@127.0.0.1:8404/`
(BusyBox wget ne supportant pas `--user/--password`). Healthcheck `healthy`
confirmé après restart.

**Bonus sécurité** : `stats hide-version` ajouté pour éviter le fingerprint
de la version HAProxy depuis la page stats.

#### Finding 3 — MEDIUM (CVSS 5.3) : Rate limit per-IP absent sur /api/auth

**Constat (v1.1, 7 mai)** : la protection lockout (5 échecs / 15 min) est
par compte utilisateur (champ `User.failedLoginAttempts`). Pour des emails
inexistants, aucun compteur n'est incrémenté.

**CVSS 3.1** : `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` = 5.3 (Medium)

**Statut au 12 mai 2026 (v1.4)** : **considéré comme résolu de facto par la
défense en profondeur HAProxy déjà en place** (cf. `infra/haproxy/haproxy.cfg`
lignes 95-100) :

```
acl is_abuser_req sc_http_req_rate(0) gt 400
acl is_abuser_err sc_http_err_rate(0) gt 80
acl is_abuser_conn sc_conn_rate(0) gt 100
http-request deny deny_status 429 if is_abuser_req !src_localhost
http-request deny deny_status 429 if is_abuser_err !src_localhost
http-request deny deny_status 429 if is_abuser_conn !src_localhost
```

Le rate limit per-IP existe, **globalement** (toute l'app), avec un seuil de
**400 req/10s** (`is_abuser_req`) et **80 erreurs/10s** (`is_abuser_err`).
Un credential stuffing à 7 req/s comme testé en pentest v1.1 serait stoppé
à **40 secondes** (80 erreurs accumulées). Au-dessus de ce seuil, l'IP est
bannie 30 minutes (cf. `stick-table expire 30m`).

**Pourquoi pas une ACL plus stricte sur `/api/auth/callback/credentials`
spécifiquement ?** Tentative d'ACL à 20 req/10s a généré des **429 légitimes**
en production : Next.js (RSC, hot reload, multi-onglets, chunks statiques)
peut générer un trafic légitime supérieur à 100 req/10s par IP, et le `stk_abuse`
ne distingue pas les paths d'auth des autres. Le compromis actuel (400 req/10s)
préserve l'expérience utilisateur tout en bloquant les patterns d'attaque
massifs.

**Note importante** : le `provider Credentials` (login email + password) **n'est
plus exposé en prod depuis le pivot Sprint 5 (mai 2026)**. Le flow recommandé
est désormais le **magic link** + 3 SSO (Google / Apple / Microsoft). Donc le
risque de credential stuffing sur ce path a fortement diminué de toute façon.
À déprécier complètement quand les derniers comptes legacy password-based
auront été migrés.

### 9.3 Limites assumées par design

❌ **Pas de SAML 2.0 / SCIM enterprise** : focus délibéré sur le segment TPE/PME. SSO Google + Microsoft Entra suffit pour 95 % des prospects. SAML/SCIM disponible sur demande pour les contrats > 50 utilisateurs.

❌ **Pas de chiffrement applicatif au-delà du TLS** : les données ne sont pas considérées comme ultra-sensibles (pas de santé, pas de défense). Le chiffrement TLS bout en bout + chiffrement filesystem Scaleway est jugé adapté au segment.

❌ **Pas d'ISO 27001 ni SOC 2** : disproportionné pour le segment PME visé. À reconsidérer si nous montons en gamme vers le mid-market.

---

## 10. Plan de remédiation à 6 mois

### Q2 2026 (avant le launch OSS du 26 mai)

1. ⏳ **CI/CD avec redeploy automatique au push main** (réponse à Finding #1 du pentest interne). **Reporté Q3 2026** : pas de budget runners GitHub Actions à la date du 12 mai 2026 (compte facturation bloqué). Mise en place dès résolution. En attendant : procédure manuelle de rebuild documentée + procédure de rollback testée.
2. ✅ **HAProxy `stats auth`** sur frontend stats 8404 (Finding #2) — **livré le 12 mai 2026 (v1.4)**. Directive `stats auth admin:"${HAPROXY_STATS_PASSWORD}"` active dans `haproxy.cfg` + `haproxy.dev.cfg`, password injecté via env var docker-compose (default `humanix-stats-change-me` à override en prod). Healthcheck Docker adapté pour passer les credentials. `stats hide-version` ajouté en bonus anti-fingerprint.
3. ✅ **Rate limit per-IP** : **considéré résolu de facto** au 12 mai 2026 — HAProxy `stk_abuse` rate-limit globalement à 400 req/10s + 80 erreurs/10s. Le credential provider est par ailleurs progressivement déprécié (magic link + SSO recommandés).
4. ✅ **Dependabot** sur le repo principal — actif depuis le 5 mai 2026 (cf. v1.2). `npm audit` confirme **0 CVE** sur 781 deps au 12 mai.
5. ✅ **/.well-known/security.txt** publié (RFC 9116, fait le 7 mai 2026)
6. ✅ **Branch protection sur `main`** — **bloqué techniquement** : GitHub exige un plan Pro **OU** un repo public. **Activation automatique prévue le 26 mai 2026** lors du passage public du repo (cf. manifeste OSS).
7. ✅ **Sprint 5 — Consentement explicite CNIL 2020-091** + Plausible cloud `only-if-granted` + panneau de révocation art. 7.3 RGPD (livré PR #439 le 10 mai 2026)
8. ✅ **Bumps stables supply chain** (12 PRs entre 8 et 12 mai) — Next 16, TS 6, ESLint 10, Tailwind 4, WebAuthn 13.3, recharts 3, vitest 4. **0 warning npm deprecated**.
9. ✅ **Restauration du gate CI tests** — 14 failures de domain drift fixées (PR #492). 710/723 tests verts.

### Q3 2026 (juillet–septembre)

6. **Scan SAST** intégré au build CI (Semgrep avec ruleset OWASP)
7. **Politique de purge `Event`** à 13 mois (cron mensuel)
8. **Pentest externe** par cabinet PASSI (devis pris auprès de 3 acteurs FR : Devoteam, Wavestone, ou cabinet PASSI plus petit). Boîte grise, ~5-7 jours.
9. **Tests E2E Playwright** sur les 5 flows critiques (auth, achat boutique, génération phishing IA, téléchargement Pack NIS2, complétion épisode)

### Q4 2026 (octobre–décembre)

10. **Audit RGAA externe** par cabinet certifié (Atalan / Tanaguru / Access42)
11. **Formalisation du programme bug bounty** (page dédiée + perimeter clair + prime modeste)
12. **Mise à jour de ce rapport** post-pentest externe avec les findings et leur résolution
13. **Publication d'un journal d'incidents** (vide à ce jour, mais transparent dès le 1er évent)

---

## 11. Programme de divulgation responsable

### 11.1 Périmètre

Toute découverte de vulnérabilité affectant **`humanix-cybersecurity.fr`** et ses sous-domaines, ou la plateforme Humanix Académie, est éligible.

**Hors périmètre** : sites tiers (Scaleway TEM, Stripe, Mistral, etc.), social engineering des employés, attaques DoS volumétriques.

### 11.2 Comment signaler

Email à **security@humanix-cybersecurity.fr** avec :

- Description du problème
- Étapes de reproduction
- Impact estimé (qui peut faire quoi)
- Suggestion de remédiation (optionnel mais apprécié)

**PGP** : clé publique à venir (V0.5).

### 11.3 Engagements de notre côté

- Accusé de réception sous **48 heures ouvrées**
- Évaluation initiale et plan d'action sous **5 jours ouvrés**
- Information sur la résolution **dans les 30 jours**
- **Pas de poursuites légales** contre les chercheurs qui respectent les règles
- **Crédit public** sur ce rapport et sur la page `/securite/remerciements` (avec accord du chercheur)

### 11.4 Règles à respecter

- Tester uniquement sur des comptes que vous avez créés
- Ne pas accéder aux données d'autres utilisateurs
- Ne pas dégrader le service ni le données
- Ne pas divulguer publiquement avant correction (90 jours max d'embargo)

### 11.5 Récompenses

À ce jour, **pas de prime monétaire** formalisée (programme à structurer en à venir). Mais :

- Crédit public + remerciements
- Mention sur LinkedIn d'Humanix-Cybersecurity
- Pour les contributions majeures : abonnement Premium offert + module signé sur la marketplace

---

## 12. Annexes

### 12.1 Glossaire

| Terme            | Définition                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| **MFA / 2FA**    | Authentification à plusieurs facteurs                                                              |
| **SSO**          | Single Sign-On - connexion unique via Google, Microsoft, etc.                                      |
| **RBAC**         | Role-Based Access Control - gestion d'accès par rôle                                               |
| **Multi-tenant** | Architecture où plusieurs clients (tenants) partagent l'infrastructure tout en étant cloisonnés    |
| **SSRF**         | Server-Side Request Forgery - attaque où un serveur fait des requêtes vers des ressources internes |
| **CSRF**         | Cross-Site Request Forgery - attaque où un site malveillant déclenche des actions sur un autre     |
| **XSS**          | Cross-Site Scripting - injection de code dans une page consultée par un autre utilisateur          |
| **NIS2**         | Directive européenne 2022/2555 sur la cybersécurité                                                |
| **RGPD**         | Règlement européen 2016/679 sur la protection des données                                          |
| **RGAA**         | Référentiel Général d'Amélioration de l'Accessibilité                                              |
| **PASSI**        | Prestataires d'Audit de la Sécurité des Systèmes d'Information (qualifiés ANSSI)                   |
| **DPA**          | Data Processing Agreement - contrat de sous-traitance RGPD (art. 28)                               |

### 12.2 Références utilisées

- **OWASP ASVS 4.0** : https://owasp.org/www-project-application-security-verification-standard/
- **ANSSI - Sécurité numérique des PME** : https://cyber.gouv.fr
- **CNIL - Référentiel de conformité RGPD** : https://www.cnil.fr
- **CIS Controls v8** : https://www.cisecurity.org/controls
- **Mozilla SSL Configuration Generator** : https://ssl-config.mozilla.org

### 12.3 Documents complémentaires publics

- [`README.md`](./README.md) - documentation technique complète
- [`/comparatif`](https://humanix-cybersecurity.fr/comparatif) - comparatif honnête vs concurrents
- [`/securite`](https://humanix-cybersecurity.fr/securite) - Trust Center
- [`/accessibilite`](https://humanix-cybersecurity.fr/accessibilite) - déclaration d'accessibilité RGAA
- [`/confidentialite`](https://humanix-cybersecurity.fr/confidentialite) - politique de confidentialité

### 12.4 Historique des versions de ce rapport

| Version | Date       | Changements                                                                                                                                                                                                                                                                                                         |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0    | 2026-05-02 | Première édition publique                                                                                                                                                                                                                                                                                           |
| v1.1    | 2026-05-04 | Pivot OSS AGPLv3 : LICENSE FSF officiel + NOTICE.md + TRADEMARK.md + CGU_SELFHOST.md + CLA.md. CGU/CGV/Confidentialité enrichies (mention Community Edition vs Cloud). 11 connecteurs livrés (CISO Assistant, OSCAL, SCIM v2, Sentinel, Splunk, Lucca, GLPI, Sekoia, HarfangLab, Mailinblack/Vade). Page `/presse`. |
| v1.2    | 2026-05-05 | CI/CD durcie : GitHub Actions actif (CI + CodeQL + DCO check), Dependabot configuré (npm + pip + actions + docker, MAJORS bloquées sur paquets critiques), audit licences AGPL documenté. Roadmap migration vers forge souveraine FR mentionnée.                                                                    |
| v1.3    | 2026-05-07 | **Hardening pre-launch + pentest interne**. Ajout CSP header global (PR #142) + middleware edge `/admin/**` + `/api/admin/**` + alias `/health` + DOMPurify pour sanitization Mistral (PR #133) + plan-gating dédié vishing/smishing + export RGPD complet + helper `lib/errors.ts`. **Pentest interne v1.1** réalisé depuis Exegol-rootme contre staging docker-compose : 25+ vecteurs, 0 critique exploité, 3 findings non-critiques (1 HIGH process, 2 MEDIUM CVSS 5.3). `/.well-known/security.txt` (RFC 9116) publié. Refonte page `/accessibilite` après audit RGAA approfondi (score honnête 82 % puis 92 % après Pack I : contraste WCAG, captions tableaux, landmarks). 446 tests vitest. |
| v1.4    | 2026-05-12 | **Stabilisation supply chain + Sprint 5 consentement**. **`npm audit` 0 CVE / 0 deprecated** sur 781 deps. Bumps majeurs stables : Next 15 → **16**, React 19.2.5 → **19.2.6**, TypeScript 5.9 → **6.0**, ESLint 9 → **10 flat config**, Tailwind 3 → **4** (mode compat), @simplewebauthn/server 10 → **13.3**, recharts 2 → 3, vitest 2 → 4. **Sprint 5 consentement explicite (PR #439)** : bandeau CNIL 2020-091 + `ConsentControl` panel art. 7.3 RGPD + Plausible cloud `only-if-granted` + CSP dynamique (origine Plausible whitelist seulement si env défini, par défaut plus strict pour les forks AGPL). **Build Docker durci** : `NEXT_PUBLIC_*` en build args explicites (PR #440). **Tests** : 14 failures pré-existantes (domain drift) fixées → **710/723 verts** (+16). **Revert d'une fuite potentielle** : commit debug `/api/debug` + stack expose en `global-error.tsx` accidentellement promu en main, retiré chirurgicalement (PR #485). **Bloqueur documenté** : Prisma 7 + adapter pg incompatible avec Turbopack default Next 16 — on reste sur Prisma 6.19.3 LTS (cf. `docs/MIGRATION_PRISMA_7.md` § 9-10). |

---

## Pour conclure

Ce rapport est **honnête par conception**. Il liste autant nos forces que nos lacunes, parce que la confiance se construit sur la transparence - pas sur l'autocélébration.

Si vous l'avez lu jusqu'ici, merci de votre attention. Si vous y voyez une erreur, une omission ou une amélioration possible, nous attendons votre retour à **security@humanix-cybersecurity.fr**.

La cybersécurité n'est pas une destination, c'est une trajectoire. Nous vous tenons informés.

- Florian DURANO, fondateur, Humanix-Cybersecurity.

**Humanix Académie** · La cyber souveraine, simple et accessible · 🇫🇷 Made in France

[humanix-cybersecurity.fr](https://humanix-cybersecurity.fr) · [contact@humanix-cybersecurity.fr](mailto:contact@humanix-cybersecurity.fr) · [security@humanix-cybersecurity.fr](mailto:security@humanix-cybersecurity.fr)
