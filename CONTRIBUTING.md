# Contribuer à Humanix Académie

Merci de t'intéresser au projet ! Toute contribution est bienvenue : code,
documentation, traductions, modules pédagogiques, retours d'expérience,
signalements de bugs ou de vulnérabilités.

Ce guide t'explique comment contribuer efficacement, avec un minimum
d'aller-retours.

---

## Sommaire

1. [Mon premier PR - par où commencer](#mon-premier-pr--par-où-commencer)
2. [Code de conduite](#code-de-conduite)
3. [Types de contributions acceptées](#types-de-contributions-acceptées)
4. [Contribuer un module MDX](#contribuer-un-module-mdx)
5. [Setup local](#setup-local)
6. [Workflow de contribution](#workflow-de-contribution)
7. [Conventions de code](#conventions-de-code)
8. [Conventions de commit](#conventions-de-commit)
9. [Conventions de PR](#conventions-de-pr)
10. [Signature des commits (DCO)](#signature-des-commits-dco)
11. [Programme Maintainer](#programme-maintainer)
12. [Questions](#questions)

---

## Mon premier PR - par où commencer

Tu débarques, tu veux contribuer, tu ne sais pas où mettre les mains. Voici les
3 portes d'entrée par effort croissant.

### Porte 1 - La typo (10 minutes)

La plus accessible. Tu lis le README ou un fichier docs et tu vois une faute,
une formulation maladroite, un lien cassé. Tu fork, tu corriges, tu pousses.

```bash
git clone git@github.com:TON-USERNAME/Humanix-Academie.git
cd Humanix-Academie
# Tu corriges le fichier
git commit -s -m "docs(readme): corrige typo dans la section Quickstart"
git push origin main
# Ouvre une PR
```

Pas besoin de tout setup. La review est rapide.

### Porte 2 - Le module MDX pédagogique (1-2 heures)

C'est la voie royale. Le catalog (`prisma/catalog-saisons.ts`) liste **26 saisons**
de **6 épisodes chacune** = 156 modules attendus. Au moment de l'écriture,
**8 saisons sont complètes en MDX expert** (48 modules) - il reste 108 modules
à enrichir. Voir la section [Contribuer un module MDX](#contribuer-un-module-mdx).

### Porte 3 - La feature ou le connecteur (1-5 jours)

Pour les développeurs qui veulent contribuer du code. Issues marquées
`good first issue` sur GitHub. Si tu veux ajouter un connecteur (Drata, Vanta,
JumpCloud, ServiceNow), modèle dans `connectors/ciso-assistant/`. RFC d'abord
pour toute feature de plus de 200 lignes.

---

## Code de conduite

Ce projet adhère au [Contributor Covenant 2.1](./CODE_OF_CONDUCT.md). En
participant, tu acceptes de respecter ce code. Tout comportement abusif peut
être signalé à `security@humanix-cybersecurity.fr` - traitement confidentiel
sous 72 h.

---

## Types de contributions acceptées

| Type                   | Comment                                                           | Validation                     |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------ |
| **Bugfix**             | Issue + PR                                                        | Review d'un mainteneur         |
| **Documentation**      | PR directe (typo, exemple, traduction)                            | Review légère                  |
| **Nouvelle feature**   | RFC d'abord (issue avec label `rfc`) puis PR                      | Discussion + review            |
| **Module pédagogique** | PR dans `content/community/`                                      | Review pédagogique + technique |
| **Traduction**         | PR dans `messages/<locale>.json`                                  | Review native speaker          |
| **Refactor large**     | RFC obligatoire                                                   | Discussion + review            |
| **Sécurité**           | NE PAS ouvrir d'issue publique. Voir [SECURITY.md](./SECURITY.md) | Disclosure responsable         |

Avant d'ouvrir une PR de feature ou de refactor large, **discute d'abord** via
une issue ou GitHub Discussions. Ça évite que tu passes une semaine sur du code
qu'on devra refuser pour des raisons d'architecture.

---

## Contribuer un module MDX

Les modules pédagogiques sont au cœur de la valeur Humanix. Chaque module est
un fichier MDX dans `content/saisons/<saison-slug>/<episode-slug>.mdx`.

### 1. Choisir un slot vide

Ouvre `prisma/catalog-saisons.ts` et trouve un episode dont le slug n'a pas
encore de fichier MDX correspondant dans `content/saisons/`. Exemple : la
saison `mobile-smartphone` (saison 8) ou `nis2-pme` (saison 19) sont
intégralement vides.

### 2. Étudier un modèle solide

Avant de commencer, lis attentivement 2-3 modules existants pour absorber la
grammaire :

- `content/saisons/phishing/01-mail-du-pdg.mdx` - easy, narratif court
- `content/saisons/fraude-president/06-cas-pathe.mdx` - hard, cas réel
- `content/saisons/dpo-quotidien/01-aipd.mdx` - medium, juridique structuré

### 3. Écrire le module

Frontmatter strict :

```yaml
---
title: "Titre du module (5-80 caractères, pas de < > &)"
durationMinutes: 6   # 5-10 cible
persona: "tous"      # "tous" / "compta" / "rh" / "dev" / "dpo" / etc.
objective: "Objectif pédagogique en 1 ligne"
xpReward: 60         # 40 (easy) / 60 (medium) / 90 (hard)
scenario: |
  Le scénario en 2-3 paragraphes. Concret, terrain, avec un personnage.
  Doit aboutir à une question : "Que faites-vous ?"
choices:
  - id: "a"
    label: "Choix réaliste 1 (5-240 caractères)"
    outcome: "good" | "bad" | "neutral"
    feedback: "Feedback de 10-500 caractères"
    points: 30   # -30 à +50
  # ... 2 à 4 choix au total, AU MOINS un "good"
debrief: |
  Le débrief structuré : 100-2500 caractères. Sections, listes, exemples.
  C'est ici que se transmet le savoir.
quiz:
  - question: "Question (10-300 caractères)"
    choices:
      - id: "a"
        label: "Réponse 1"
        correct: true
      - id: "b"
        label: "Réponse 2"
        correct: false
    explanation: "Explication 10-600 caractères"
  # ... 1 à 5 questions
---

## Pour aller plus loin

[Section libre, ton conversationnel.]

> "Citation marquante en une ligne."
```

### 4. Règles éditoriales Humanix

- **Vocabulaire bienveillant** : "photo claire de la maturité" plutôt que "score de risque", "leviers à votre portée" plutôt que "failles à corriger". Pas de "OBLIGATOIRE", "URGENT", "CRITIQUE".
- **Pas de peur martelée** : "voici 3 choses concrètes à faire" plutôt que "vous êtes en danger".
- **Cas réel français privilégié** : Pathé, CHU de Brest, Samsung sont nos références. Évite les cas US sauf s'ils sont incontournables (Arup HK 25 M$, etc.).
- **4 choix avec un "neutral"** : éviter les binaires. Un choix "ça dépend" enrichit la pédagogie.
- **Citation finale signée** : tradition Humanix, marque la pause réflexive.

### 5. Slug ASCII strict

Le slug doit matcher `/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/` - pas d'accents,
pas de caractères spéciaux. Le validateur CI (`npm run validate:mdx`) bloque
sinon.

### 6. Tester en local

```bash
npm run dev
# Ouvre http://localhost:3000/saisons/<saison-slug>/<episode-slug>
# Le module charge en mode expert (badge 📝) si le frontmatter est valide
npm run validate:mdx   # Vérifie que slug + frontmatter matchent le catalog
```

### 7. Commit + PR

```bash
git checkout -b feat/mdx-mobile-smartphone-01
git add content/saisons/mobile-smartphone/01-pin-faible.mdx
git commit -s -m "feat(content): module mobile-smartphone 01-pin-faible"
git push origin feat/mdx-mobile-smartphone-01
# Ouvre PR
```

Le titre du PR mentionne la saison + l'épisode. La review pédagogique se fait
en parallèle de la review technique. Compter 2-5 jours pour le merge selon
charge.

---

## Setup local

### Prérequis

- Node.js 20+ (recommandé : version dans `.nvmrc`)
- Docker 24+ et Docker Compose v2
- PostgreSQL 16 (ou via Docker)
- Git 2.30+

### Installation pas-à-pas

```bash
# 1. Fork sur GitHub puis clone TON fork
git clone git@github.com:TON-USERNAME/humanix-academie.git
cd humanix-academie

# 2. Ajoute le repo upstream
git remote add upstream https://github.com/Humanix-Cybersecurity/Humanix-Academie.git

# 3. Installe les dépendances
npm install

# 4. Configure ton environnement
cp .env.example .env.local
# Édite .env.local : DATABASE_URL, AUTH_SECRET, etc.

# 5. Démarre PostgreSQL en local (Docker)
docker compose up -d postgres

# 6. Applique les migrations + seed
npx prisma migrate deploy
npx prisma db seed

# 7. Lance le dev server
npm run dev
# Disponible sur http://localhost:3000
```

### Tests

```bash
npm run test           # Tests unitaires (Vitest)
npm run test:e2e       # Tests end-to-end (Playwright)
npm run lint           # ESLint
npm run typecheck      # TypeScript strict
npm run check          # Tous les checks ci-dessus
```

Avant chaque commit, lance au minimum `npm run check`.

---

## Workflow de contribution

```
1. Fork le repo sur ton compte GitHub
2. Crée une branche depuis main :
     git checkout -b feat/ma-super-feature
3. Code, teste, commit (cf. conventions ci-dessous)
4. Pousse sur ton fork :
     git push origin feat/ma-super-feature
5. Ouvre une Pull Request vers Humanix-Cybersecurity/Humanix-Academie:main
6. Réponds aux retours de review
7. Une fois approuvée, un mainteneur merge ta PR
```

### Synchroniser ton fork avec upstream

Avant chaque nouvelle branche, mets à jour ton fork :

```bash
git checkout main
git fetch upstream
git rebase upstream/main
git push origin main
```

---

## Conventions de code

### TypeScript

- **Strict mode obligatoire** (déjà activé dans `tsconfig.json`)
- Pas de `any` sauf justification dans un commentaire
- Préférer `unknown` à `any` pour les parsers
- Préférer `type` aux `interface` sauf pour l'extension

### Style

- **Prettier** est la source de vérité. Lance `npm run format` avant commit.
- Pas de mix tabs/espaces (2 espaces partout, configuré dans `.editorconfig`)
- Lignes de 100 colonnes max (configuré)

### Composants React

- Composants en **PascalCase**, fichiers idem
- 1 composant principal par fichier (helpers en dessous OK)
- Props typées avec `type Props = { ... }` au-dessus du composant
- Préférer les composants serveur (RSC) ; ajouter `"use client"` seulement si nécessaire (state, effects, browser API)

### Tailwind

- Classes utilitaires uniquement (pas de CSS custom sauf cas limite)
- Utiliser les composants design-system de `app/globals.css` (`card`, `btn-primary`, `card-hero`, etc.)
- Dark mode obligatoire pour tout nouveau composant (classes `dark:...`)

### Tests

- Tout bugfix DOIT être accompagné d'un test qui reproduit le bug
- Toute nouvelle feature DOIT avoir au moins 1 test (unitaire ou e2e)
- Coverage cible : 70 % sur le code métier (`lib/`)

### Sécurité - patterns à respecter

Humanix Académie est un produit cyber : la posture sécurité du **code lui-même** doit refléter ce qu'on enseigne. Deux principes fondateurs : **Zero-Trust** et **Least Privilege**.

**1. RBAC centralisé sur les routes API**

Toute route API qui mute des données ou expose des données sensibles DOIT utiliser les helpers de `lib/api/require-role.ts` :

```ts
// ❌ Ne PAS faire (oubli facile, pas d'audit log automatique)
const session = await auth();
if (!session?.user) return NextResponse.json({error:...}, {status:401});
if (session.user.role !== "ADMIN") return NextResponse.json({error:...}, {status:403});

// ✅ Faire
import { requireAdmin } from "@/lib/api/require-role";
const guard = await requireAdmin(req);
if ("response" in guard) return guard.response;
const { session } = guard;
```

Variants disponibles :
- `requireSession()` - user connecté quelconque
- `requireAdmin(req?)` - ADMIN, RSSI, SUPERADMIN
- `requireSuperadmin(req?)` - SUPERADMIN uniquement
- `requireRole([...], req?)` - liste explicite
- `requireTenantMember(tenantId, roles?, req?)` - anti cross-tenant

Les refus produisent un audit log automatique (outcome=DENIED) → utilisable pour détecter les tentatives d'escalade.

**2. Multi-tenant : toujours filtrer `tenantId`**

Toute query Prisma sur une table contenant `tenantId` DOIT inclure le filtre. Si vous ajoutez une route qui prend un `tenantId` en URL/body, utilisez `requireTenantMember()` pour vérifier l'appartenance.

Les tests `lib/tenant-isolation.test.ts` doivent passer après tout PR qui touche aux server actions.

**3. PII : ne jamais transmettre à un tiers**

Avant d'envoyer du texte libre à une API tierce (Mistral, OpenAI, etc.), utilisez `lib/security/pii-filter.ts` :

```ts
import { scanPii } from "@/lib/security/pii-filter";
const { redacted, hits } = scanPii(userInput);
// envoyer `redacted` à l'API tierce, pas `userInput`
```

Détecte : email, téléphone FR, IBAN (mod 97), SIREN, SIRET, NIR, CB (Luhn).

**4. Secrets : jamais côté client**

Tout `process.env.X` qui ne commence pas par `NEXT_PUBLIC_` est server-only. Ne jamais l'importer depuis un fichier `"use client"`. Le script `npm run audit:env` vérifie en CI.

**5. Logs d'audit : actions sensibles**

Les actions sensibles DOIVENT appeler `auditLog()` (cf. `lib/audit.ts`) :
- Modifications de role (USER_ROLE_CHANGED)
- Suppressions (USER_DELETED, TENANT_DELETED)
- Billing (BILLING_*)
- Exports RGPD (DATA_EXPORTED, DATA_ERASURE_*)

L'IP est hashée SHA-256 (non-réversible). Snapshot d'identité (`actorEmail`, `actorRole`) pour survivre à la suppression de l'user.

**6. Hex Chat / IA : system prompt server-side only**

Le system prompt et le contexte enrichi sont construits côté serveur. Le client envoie uniquement `messages: [{role, content}]` + `context: {currentRoute, currentModule}`. Aucune instruction LLM ne provient du client. Cf. `app/api/ai/chat/route.ts`.

### Header de licence

Tous les fichiers source TS/TSX dans `app/`, `lib/`, `components/`, `scripts/`, `prisma/`, et `middleware.ts` doivent porter en première ligne :

```ts
// SPDX-License-Identifier: AGPL-3.0-or-later
```

(immédiatement après une directive `"use client"` / `"use server"` ou un shebang `#!` si présent).

Approche moderne FSF + Linux kernel : 1 ligne SPDX plutôt qu'un boilerplate copyright. Lisible par REUSE, FOSSology, GitHub.

**Régénération automatique** : `npm run license:headers` ajoute la ligne aux fichiers qui en manquent. La CI lance `npm run license:check` à chaque PR - bloque le merge si un fichier oublie.

Les sous-projets `connectors/` et `outlook-addin/` sont sous **MIT** (cf. leur propre `LICENSE`) et ne sont donc pas concernés par cette règle.

---

## Conventions de commit

On utilise [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/) :

```
<type>(<scope>): <description courte>

[corps optionnel multi-lignes]

[footer optionnel : Closes #123, BREAKING CHANGE: ...]
```

### Types autorisés

| Type       | Usage                               | Exemple                                                    |
| ---------- | ----------------------------------- | ---------------------------------------------------------- |
| `feat`     | Nouvelle feature utilisateur        | `feat(dashboard): ajoute filtres avancés sur table équipe` |
| `fix`      | Bugfix                              | `fix(auth): corrige redirect après SSO Microsoft`          |
| `docs`     | Documentation uniquement            | `docs(readme): clarifie installation Docker`               |
| `style`    | Formattage, pas de logique          | `style: applique prettier sur components/`                 |
| `refactor` | Refacto sans changement fonctionnel | `refactor(plans): centralise FEATURE_MIN_PLAN`             |
| `perf`     | Amélioration performance            | `perf(table): memoize row rendering`                       |
| `test`     | Ajout/modif de tests                | `test(scoring): couvre edge case score=0`                  |
| `chore`    | Maintenance (deps, config)          | `chore: bump prisma to 5.22`                               |
| `ci`       | Workflow CI/CD                      | `ci: ajoute job lint sur PR`                               |
| `build`    | Système de build                    | `build: optimise Dockerfile multistage`                    |

### Scopes courants

`auth`, `dashboard`, `admin`, `api`, `db`, `prisma`, `auth`, `gamification`,
`marketplace`, `phishing`, `nis2`, `ciso-assistant`, `pricing`, `plans`, `i18n`,
`a11y`, `infra`, `docker`.

### Exemple complet

```
feat(plans): ajoute palier Découverte forever-free

Permet aux TPE de tester Humanix sans CB, dans la limite de 5 sièges.
Conversion bottom-up vers Starter au-delà.

Closes #142
```

---

## Conventions de PR

### Titre de PR

Même format que les commits Conventional : `<type>(<scope>): <description>`.

### Description

Utilise le template `.github/PULL_REQUEST_TEMPLATE.md` (auto-rempli à
l'ouverture). Tu dois minimum :

- **Pourquoi** : quel problème ça règle, quelle valeur ça apporte
- **Comment** : approche choisie, alternatives écartées (1-3 lignes)
- **Tests** : comment tu as validé (`npm run check` + scénario manuel)
- **Screenshots** : si UI, avant/après obligatoires
- **Breaking changes** : si schema Prisma ou API publique modifiés

### Taille

Préférer **plusieurs PR petites** à une grosse PR :

- < 200 lignes modifiées : review rapide
- 200-500 lignes : review approfondie
- 500-1000 lignes : motiver dans la description
- 1000+ lignes : split en plusieurs PR ou prévenir avant

### Cycle de review

- Premier retour sous **3 jours ouvrés** (5 si jour férié FR)
- Tu réponds aux commentaires en commentant ou en commitant
- Tu peux marquer un commentaire `Resolved` quand tu l'as adressé
- Une fois approuvée, un mainteneur merge (squash par défaut, sauf si tu as
  préparé des commits atomiques significatifs)

---

## Signature des commits (DCO)

Tous les commits doivent être signés avec un **Developer Certificate of
Origin** (DCO). C'est une déclaration légère qui certifie que tu as le droit
de contribuer ton code.

### Comment signer

Ajoute le flag `-s` à tes commits :

```bash
git commit -s -m "feat(dashboard): ma super feature"
```

Cela ajoute automatiquement une ligne `Signed-off-by:` au message de commit :

```
feat(dashboard): ma super feature

Signed-off-by: Ton Nom <ton.email@example.com>
```

### Configurer git pour le faire automatiquement

```bash
git config --local format.signoff true
```

Le bot DCO de la PR vérifiera que tous tes commits sont signés. S'il en
manque un, tu peux corriger avec :

```bash
git rebase --signoff HEAD~N    # N = nombre de commits à corriger
git push --force-with-lease
```

---

## Programme Maintainer

Si tu mergses **3 PR de qualité** et que tu participes activement aux
discussions et reviews, tu peux être promu **Maintainer** :

- Droit de merge sur le repo
- Mention sur la page contributeurs
- Accès au canal Discord privé des mainteneurs
- Voix consultative dans les RFC

Pour candidater, écris à `contact@humanix-cybersecurity.fr` ou ping
`@humanix-maintainers` sur GitHub.

---

## Questions

| Type                             | Où aller                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Question d'usage / configuration | [GitHub Discussions · Q&A](https://github.com/Humanix-Cybersecurity/Humanix-Academie/discussions/categories/q-a)     |
| Idée de feature à débattre       | [GitHub Discussions · Ideas](https://github.com/Humanix-Cybersecurity/Humanix-Academie/discussions/categories/ideas) |
| Bug confirmé                     | [GitHub Issues](https://github.com/Humanix-Cybersecurity/Humanix-Academie/issues)                                    |
| Vulnérabilité sécurité           | security@humanix-cybersecurity.fr (voir [SECURITY.md](./SECURITY.md))                                                |
| Discussion live                  | Discord (lien dans GitHub Discussions, accès libre)                                                                  |
| Contact direct                   | contact@humanix-cybersecurity.fr                                                                                     |

---

Merci de contribuer. Chaque PR, chaque issue, chaque question fait avancer la
brique humaine de la cyber souveraine française.

_Humanix Cybersecurity_
