# Contribuer à Humanix Académie

Merci de t'intéresser au projet ! Toute contribution est bienvenue : code,
documentation, traductions, modules pédagogiques, retours d'expérience,
signalements de bugs ou de vulnérabilités.

Ce guide t'explique comment contribuer efficacement, avec un minimum
d'aller-retours.

---

## Sommaire

1. [Code de conduite](#code-de-conduite)
2. [Types de contributions acceptées](#types-de-contributions-acceptées)
3. [Setup local](#setup-local)
4. [Workflow de contribution](#workflow-de-contribution)
5. [Conventions de code](#conventions-de-code)
6. [Conventions de commit](#conventions-de-commit)
7. [Conventions de PR](#conventions-de-pr)
8. [Signature des commits (DCO)](#signature-des-commits-dco)
9. [Programme Maintainer](#programme-maintainer)
10. [Questions](#questions)

---

## Code de conduite

Ce projet adhère au [Contributor Covenant 2.1](./CODE_OF_CONDUCT.md). En
participant, tu acceptes de respecter ce code. Tout comportement abusif peut
être signalé à `security@humanix-cybersecurity.fr` — traitement confidentiel
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
git remote add upstream https://github.com/humanix-cybersecurity/humanix-academie.git

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
5. Ouvre une Pull Request vers humanix-cybersecurity/humanix-academie:main
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

### Header de licence

Tous les fichiers source TS/TSX dans `app/`, `lib/`, `components/`, `scripts/`, `prisma/`, et `middleware.ts` doivent porter en première ligne :

```ts
// SPDX-License-Identifier: AGPL-3.0-or-later
```

(immédiatement après une directive `"use client"` / `"use server"` ou un shebang `#!` si présent).

Approche moderne FSF + Linux kernel : 1 ligne SPDX plutôt qu'un boilerplate copyright. Lisible par REUSE, FOSSology, GitHub.

**Régénération automatique** : `npm run license:headers` ajoute la ligne aux fichiers qui en manquent. La CI lance `npm run license:check` à chaque PR — bloque le merge si un fichier oublie.

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
| Question d'usage / configuration | [GitHub Discussions · Q&A](https://github.com/humanix-cybersecurity/humanix-academie/discussions/categories/q-a)     |
| Idée de feature à débattre       | [GitHub Discussions · Ideas](https://github.com/humanix-cybersecurity/humanix-academie/discussions/categories/ideas) |
| Bug confirmé                     | [GitHub Issues](https://github.com/humanix-cybersecurity/humanix-academie/issues)                                    |
| Vulnérabilité sécurité           | security@humanix-cybersecurity.fr (voir [SECURITY.md](./SECURITY.md))                                                |
| Discussion live                  | Discord (lien dans GitHub Discussions, accès libre)                                                                  |
| Contact direct                   | contact@humanix-cybersecurity.fr                                                                                     |

---

Merci de contribuer. Chaque PR, chaque issue, chaque question fait avancer la
brique humaine de la cyber souveraine française.

_Humanix Cybersecurity_
