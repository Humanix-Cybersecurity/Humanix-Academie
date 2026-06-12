# Changelog - Humanix Académie

Toutes les évolutions notables du produit, classées par version. Conforme
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) +
[SemVer](https://semver.org/lang/fr/).

---

## [Unreleased] - sur `main` (non taggé)

Cycle post-v1.2.0 : exposition numérique & OSINT souverains, hub conformité
multi-référentiels, certificat au nom réel, et une série de durcissements
sécurité + fixes de catalogue prod. Déjà déployé en production depuis `main`.

### Added

#### 🕵️ Exposition numérique & OSINT (zéro stockage)

Brique « Suis-je exposé ? » pour outiller la personne sans jamais conserver de
donnée personnelle (anti-doxxing par conception).

- **Outil public `/exposition`** : 3 auto-diagnostics - mot de passe (k-anonymity
  Pwned Passwords, le mot de passe ne quitte jamais le navigateur en clair),
  email et téléphone - + **score d'exposition** affiché RGAA. APIs éphémères,
  **aucune PII conservée**, aucun compte requis.
- **Parcours auto-OSINT guidé en 4 phases** : checklist pour rechercher ses
  propres traces (moteurs, réseaux, data brokers/Pappers, métadonnées photo),
  **limiter la casse**, **demander la suppression** et protéger son image.
- **Plan de remédiation** personnalisé + déclenchement de micro-modules + opt-in
  compte (tout optionnel).
- **Saison `osint-particuliers`** (6 épisodes MDX) : empreinte numérique,
  LinkedIn, métadonnées photo, réseaux & famille, data brokers, défense OSINT.
- **Stats communautaires anonymisées** (agrégats, 0 PII individuelle).
- **Veille d'exposition B2B `/admin/exposition`** (Enterprise) : surveillance de
  l'exposition des collaborateurs sur le domaine du tenant - **gardée OFF par
  défaut** (triple garde), activation conditionnée à un DPA + AIPD + notice
  salariés, propriété du domaine prouvée par match sur un email vérifié du
  tenant. Reporting de posture (NIS2 art. 21 / RGPD art. 32) + exports SIEM
  (JSON + CEF), **sans** notification CNIL art. 33 (par design).
  Docs : [`docs/exposition-numerique/`](./docs/exposition-numerique/) (roadmap,
  AIPD, notice salariés, runbook d'activation).

#### 📊 Hub conformité multi-référentiels `/admin/conformite`

- Couverture calculée **par tenant** sur **7 référentiels** : ISO 27001:2022,
  NIS2, RGPD, ANSSI Guide d'hygiène, NIST CSF v2.0, Loi Sapin II Art. 17, SOC 2.
- Repose sur le mapping technique versionné [`lib/mapping-grc.ts`](./lib/mapping-grc.ts)
  (jamais de surcote d'un contrôle) ; preuves exportables vers CISO Assistant.

#### 🛡️ Certificat au nom réel (optionnel)

- Nouveaux champs **optionnels** `User.firstName` / `User.lastName` ; `/profil/infos`
  passe à 3 champs (pseudo, prénom, nom).
- Le certificat PDF utilise « Prénom Nom » **uniquement si les deux sont
  renseignés**, sinon il retombe sur le pseudo (comportement historique
  préservé). Helper `certificateName()` + tests.

#### 🧭 SUPERADMIN - bypass opérateur

- `planHasFeature(plan, feature, role?)` : le rôle SUPERADMIN (opérateur
  plateforme) outrepasse les gates de plan, sans changer le comportement des
  rôles tenant. 21 sites de gating balayés.

### Changed

- **`/apprendre`** : remplacement du carrousel par un **accordéon par catégorie**
  (repliable), suppression du code mort `SaisonsCarousel`.
- **Modules** : la position de la bonne réponse aux quiz est **randomisée**
  (anti « clic sans lire »).

### Fixed

- **Catalogue prod** : seed du catalogue au déploiement (modules en 404 + badges
  manquants car le catalogue n'était jamais seedé en prod) ; seed des templates
  de phishing platform-wide (`tenantId` null).
- **500 SSR** sur les épisodes sans champ `debrief` (TTSButton appelait
  `cleanForTTS(undefined)`).
- **CI Docker Publish** : build `amd64` uniquement (QEMU arm64 cassait
  `prisma generate`).

### Security

- **SSRF** : épinglage de l'IP résolue pour les fetch sortants vers des URL
  tenant/admin (anti DNS-rebinding, ferme le TOCTOU résiduel) - cf.
  `lib/net/pinned-agent`.
- **Sanitisation HTML serveur** des templates de phishing (DOMPurify,
  `lib/sanitize-html.ts`).
- **Crons** : scoping au tenant appelant (plus de traitement cross-tenant).
- Durcissements mineurs (bornes de validation, escalade de privilège).

---

## [1.2.0] - 2026-05-22 🧠 Sprint AI Literacy + Backup self-host + License pubkey prod

Cycle de release post-launch v1.0.0 / v1.1.0. Trois chantiers majeurs + une série de fixes opérationnels.

### Added

#### 🧠 Sprint "AI Literacy" - première position FR sur la maîtrise de l'IA

Suite au feedback Digital 113 Members Day : forte demande des entreprises FR pour comprendre l'IA générative sans alarmisme. Positionnement : *"L'IA ne te remplacera pas. Quelqu'un qui sait l'utiliser, oui."*

- **Landing publique `/maitrise-ia`** : hero soft + 3 études citées (MIT Media Lab *"Your Brain on ChatGPT"* 2025, Stanford HAI 2025, AI Act EU 2026) + preview 12 épisodes + section dirigeants + section Cyber-Famille. SEO complet (canonical, OG).
- **3 articles Cyber-Famille** (CC BY-SA dans `library-seed-demo.ts`) :
  - 👵 *"Mamie, ChatGPT n'est pas Google"* - règle santé/argent/papiers
  - 🎓 *"Quand ton ado utilise ChatGPT pour ses devoirs"* - méthode 3 niveaux d'usage
  - 🎭 *"Mon proche est tombé pour un deepfake"* - règle "raccrocher + rappeler"
- **Module admin `/admin/maturite-ia`** : questionnaire 8 axes (charte IA, formation, shadow AI, données sensibles, supervision humaine, deepfake, AI Act, audit) → score 0-100 + benchmark sectoriel (médiane PME FR = 42/100) + plan d'action priorisé live + export JSON. Persistance localStorage en V1.
- **Saison "Maîtrise de l'IA générative"** - 12 épisodes au catalogue, 3 MDX rédigés en MVP (E01 hallucinations, E03 atrophie MIT 2025, E04 mes données partent où). Sources MIT/Stanford/ANSSI/AI Act.

#### 💾 Backup/restore self-host avec chiffrement client-side

Postgres tourne en self-host (container Docker non-exposé) sans snapshots managed. La doc `docs/BACKUPS.md` décrivait la cible mais aucun script. Implémentation complète :

- **`scripts/backup-db.sh`** : pg_dump (mode `docker exec` ou host) → chiffrement `age` asymétrique (Curve25519 + ChaCha20-Poly1305) → upload FTP/FTPS via lftp → rotation 30j distant / 7j local. Options `--dry-run`, `--local-only`. Variables `BACKUP_FTP_TLS` (default yes) pour activer/désactiver TLS selon le serveur (FTP-only chez Scaleway Backup Space).
- **`scripts/restore-db.sh`** : interactif, sélection backup local ou distant, déchiffrement avec clé privée, confirmation explicite *"OUI JE CONFIRME"* avant pg_restore destructif, parallélisme x4.
- **Doc opérationnelle complète** dans `docs/BACKUPS.md` § 10 : génération clé age, setup `/etc/humanix/backup.env`, cron host, procédure restore d'urgence.

#### 🔑 Clé publique licence Ed25519 de prod

- Remplacement du placeholder `REPLACE_BEFORE_PROD_...` dans `lib/license/public-key.ts` par la vraie clé Ed25519 X.509 (validée par `node:crypto`).
- Clé privée stockée hors-bande par Humanix (1Password + papier coffre + USB chiffrée).
- Procédure de rotation documentée pour cas de compromission.

#### 🛡️ Signup avec gating rôle pro (anti-pollution tenants)

- Nouveau radio "Je m'inscris en tant que" sur `/signup?plan=starter` avec 6 options (DSI/RSSI, dirigeant, DRH/DAF, autre cadre, employé, particulier).
- Si l'utilisateur se déclare employé ou particulier → redirect serveur vers `/inscription?via=signup-role` avec bandeau emerald explicatif. Tenant Communauté en LEARNER, pas de tenant fantôme créé.
- Trace `declaredRole` dans `AuditLog.metadata.TENANT_CREATED` pour analytics post-launch.

#### 🎯 Upgrade flow Starter → Pro depuis `/tarifs`

- `/tarifs` détecte la session + plan actuel, passe à PricingCarousel.
- Card du plan actuel → badge `✓ Votre plan actuel` (non-cliquable). Card Pro pour user connecté → "Passer au Pro" qui route vers `/admin/billing#upgrade-title` (qui contient `PlanUpgradeOptions` + API auth-gated `/api/payments/checkout` → checkout Mollie lié au tenant existant, pas de 2e tenant créé).
- `PlanUpgradeOptions` : configurateur Pro (input sièges 16-250, radio billing mensuel/annuel −10 %, calcul total HT live).

#### 📝 Form devis bridge (`/demande-abonnement`)

- 3 nouveaux champs requis : sièges, durée (6/12/24/36 mois), billing (mensuel/annuel).
- Pré-fill via query params + copy adaptive si `?via=payment-pending`.
- Estimation Pro live dans l'email founder (seats × 3 € × durée × 0.9 si annuel).
- Switch UX via `NEXT_PUBLIC_MOLLIE_AVAILABLE=false` : CTA Pro reroute du checkout vers le form devis (fallback si paiement self-service indisponible).

### Changed

- **Hero homepage Option B** : *"Pas un cours d'expert..."* → *"Reconnaître les arnaques numériques avant de cliquer : phishing, faux SMS, QR codes piégés, faux profils. Un mini-épisode par semaine, en français, pour ton équipe et ta famille. Sans jargon, sans peur, sans expert."*
- **`SIGNUP_ALLOW_SELF_SERVICE`** documenté dans `.env.example` (sortait de la whitelist secrète).
- **Mollie clarifié comme entreprise UE** (Amsterdam, régulé DNB, PSD2) dans CGV, confidentialité, DPO, page DAF, admin billing, form souscrire, COMPLIANCE.md, README. La sed-migration Payplug→Mollie avait laissé "Mollie SA (France 🇫🇷)" - corrigé en "Mollie B.V. (UE 🇪🇺, Amsterdam)".

### Fixed

- **Hex chat 400 "Missing model parameter"** en prod : `process.env.MISTRAL_MODEL ?? fallback` ne fallback pas sur string vide. Remplacé par `|| .trim()` aux 3 occurrences (Mistral provider, Ollama provider, audit-flash narrative).
- **Bordures noires partout (régression Tailwind v4)** : Tailwind v4 a changé `border-color` default de `gray-200` vers `currentColor`. Restauration du comportement v3 via règle CSS one-liner dans `@layer base` qui pointe sur `var(--color-border)`.
- **PopupCoordinator boucle infinie** (hotfix tardif v1.0.1) : déjà documenté mais inclus dans le bilan.
- **3 vulnérabilités Dependabot** corrigées : Vite Path Traversal (`@vitest/coverage-v8`), esbuild dev server (`connectors/mcp-server`), isomorphic-dompurify patch.
- **Test flaky `lib/license/license.test.ts`** : corruption du dernier char base64url ignorait 4 bits → flippe maintenant un char au milieu (déterministe).

### Security

- 0 vulnérabilité Dependabot ouverte au moment du release.
- License privkey stockée hors-bande (3 supports géographiquement séparés).
- Backup BDD chiffré client-side avant transit (age) - credentials FTP peuvent fuiter sans compromettre les données.

### Documentation

- `docs/BACKUPS.md` § 10 : 150 LoC de procédure opérationnelle complète (setup, cron, restore d'urgence).
- `docs/CRON.md` : référence des 10 jobs cron (9 endpoints `/api/cron/*` via Ofelia + 1 backup host).
- README.md : positionnement "Stack souveraine UE" clarifié (Scaleway/Mistral FR 🇫🇷 + Mollie UE 🇪🇺).

---

## [1.1.0] - 2026-05-20 💳 Migration provider de paiement Payplug → Mollie

### Changed

- **Provider de paiement migré de Payplug vers Mollie**. Payplug a refusé notre demande de validation KYC, ce qui rendait le checkout self-service inopérant à 24h du launch. Migration complète vers [Mollie](https://www.mollie.com) (Pays-Bas, régulé DNB, agréé établissement de paiement UE).

#### Côté code

- Nouveau module `lib/mollie.ts` qui remplace `lib/payplug.ts` (548 LoC). Utilise le SDK officiel `@mollie/api-client` (MIT).
- 5 endpoints API refactorés : `/api/payments/{checkout,checkout/start,webhook,portal,cancel}`.
- **Modèle webhook différent** (Mollie = pull-based vs Payplug = push HMAC) : la sécurité repose sur le fait que retrieve d'une ressource requiert la clé API secrète (un attaquant qui spam le webhook ne peut rien lire).
- **Flow recurring différent** : Mollie impose un "First Payment" (sequenceType=first) qui pose un MANDATE, puis on crée la Subscription après webhook payment.paid. Charges suivantes automatiques.
- Webhook unique `/api/payments/webhook` qui dispatch sur les prefixes d'ID (`tr_*` = payment, `sub_*` = subscription).
- DB schema **inchangé** (déjà provider-agnostique : `paymentProvider`, `paymentCustomerId`, `paymentSubscriptionId`). On passe simplement `"mollie"` au lieu de `"payplug"`.

#### Côté env vars

- ❌ Retirés : `PAYPLUG_SECRET_KEY`, `PAYPLUG_WEBHOOK_SECRET`, `PAYPLUG_PLAN_STARTER`, `PAYPLUG_PLAN_PRO`, `NEXT_PUBLIC_PAYPLUG_AVAILABLE`
- ✅ Ajoutés : `MOLLIE_API_KEY` (test_* ou live_*), `NEXT_PUBLIC_MOLLIE_AVAILABLE`
- Note : Mollie n'utilise pas de "plan IDs" - on calcule le montant à la volée depuis seats × prix × billing cycle (cf. `mollieAmountForPlan()`).

#### Méthodes de paiement activables côté Mollie dashboard

- CB / Visa / Mastercard
- SEPA Direct Debit (recommandé Pro/Enterprise pour stabilité recurring)
- PayPal
- Apple Pay / Google Pay

#### CSP

- `proxy.ts` : `connect-src` mis à jour pour autoriser `api.mollie.com` à la place de `api.payplug.com` + `secure.payplug.com`.

#### Compatibilité

- Le form devis (`/demande-abonnement`) introduit en v1.0.1 reste disponible comme fallback si Mollie est temporairement indisponible (flag `NEXT_PUBLIC_MOLLIE_AVAILABLE=false`).

---

## [1.0.1] - 2026-05-17 🔧 Hotfix popup coordinator

### Fixed

- **HOTFIX critique** `PopupCoordinator` : boucle infinie de re-renders qui freezait le main thread du navigateur (clics non-cliquables, navigation impossible, sans erreur console).
  - Cause : objet `value` du Provider non mémoïsé → `ctx` change à chaque render → cascade de `useEffect` cleanup/register → setState → re-render Provider → loop.
  - Fix : `useMemo` pour la value + pattern subscription explicite + split du hook `usePopupSlot` en 3 effects indépendants (subscribe / setSlot / removeSlot).
  - Cooldown 1.5s déclenché uniquement sur transitions réelles `ready` true→false (plus à chaque update).

Aucun changement fonctionnel attendu pour l'utilisateur final - la mécanique interne du coordinateur a été refondue, l'UX (sequencing, cooldown, suppression sur landing) reste identique à v1.0.0.

Commit : `f019f74` (PR [#562](https://github.com/Humanix-Cybersecurity/Humanix-Academie/pull/562))

---

## [1.0.0] - 2026-05-21 🚀 LAUNCH OSS PUBLIC

> Première version publique sous licence AGPLv3. Tous les chantiers
> stratégiques sont en place : sécurité Zero-Trust, Pack NIS2 v2, Mode
> Enquêteur, librairie SEO publique.

### 🏆 Validation externe - Triple A+ (17 mai 2026)

Trois audits publics indépendants ont validé la posture sécurité avant le launch :

| Scanner | Résultat | Détails |
|---|---|---|
| **Mozilla Observatory** | **A+** | 110/100 · 10/10 tests passés |
| **Security Headers** (Snyk) | **A+** | 6/6 en-têtes HTTP présents (CSP, HSTS, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy) |
| **Qualys SSL Labs** | **A+** | TLS 1.3 · Post-Quantum Cryptography (PQC) key exchange · HSTS long duration |

Tous les rapports sont **rejouables en temps réel** depuis [`/securite/audits-externes`](https://humanix-cybersecurity.fr/securite/audits-externes) - aucune note auto-déclarée.

### Sécurité - Zero-Trust / Least Privilege (Sprint 1-4)

- **RBAC central** (`requireRole()`) sur 30+ routes API admin, plus de patterns dupliqués
- **Filtre PII server-side** dans Hex Chat (anti exfiltration via prompt injection)
- **Client Prisma read-only** dédié aux 5 modules analytiques (forecasts, heatmap, risk-score, at-risk-users, risk-trend) → defense en profondeur SQL
- **CSP nonce per-request** ([Strict CSP](https://csp.withgoogle.com/docs/strict-csp.html) Google) - suppression effective de `unsafe-inline` pour les navigateurs CSP3-aware
- **Page publique `/securite/audits-externes`** - Mozilla Observatory, Security Headers, SSL Labs en lecture directe (transparence radicale)
- **WebAuthn passkey-first UX** sur `/connexion` (préférence mémorisée + badge "Recommandé")
- **Interface `lib/secrets`** - couche d'abstraction pour intégration Vault / Scaleway Secret Manager (préparation, sans migration forcée)
- **Image Docker Postgres custom** `humanix-postgres:secured` qui provisionne automatiquement le rôle SELECT-only au premier boot

→ Détails sécurité disponibles sur demande (audit RSSI / due diligence).

### Pack NIS2 v2 - différenciateur GRC

- **Diagnostic public 30 questions** `/diagnostic-nis2` (gratuit, sans inscription, RGPD-friendly, mappé sur les 11 articles NIS2)
- **Score per-article temps réel** pour tenants, basé sur la complétion des saisons mappées (visible dans `/admin/conformite-nis2`)
- **PDF rapport annuel autorité compétente** (CSIRT / ANSSI) - 3 pages : état des lieux + incidents + sensibilisation + plan + engagement direction
- Mapping `connectors/ciso-assistant-frameworks/mapping-humanix-awareness-to-nis2-directive.yaml` couvrant 11 articles × 12 saisons

→ Cf. [`docs/PACK_NIS2_V2.md`](./docs/PACK_NIS2_V2.md)

### Mode Enquêteur Sprint 3 - apprentissage par découverte

- **30 enquêtes** (3 OSS + 27 commercial) sur 9 types : Email, SMS, LinkedIn, Facebook, X, Instagram, photos bureau / piggyback / poubelle, Wi-Fi public
- **5 rangs Détective** (Aspirant → Cyber Sherlock → Maître Détective) avec seuils 60% / 75% / 90% / 100%
- **Leaderboard 30j** par tenant
- **Trophées partageables LinkedIn / X / clipboard** - chaque rang débloque une page publique `/badges/detective/<rank>` avec OG image dynamique
- **Premier mover marché** : aucun concurrent ne propose ce format

### Librairie - vitrine SEO publique

- **30 articles** cyber-RH accessibles **sans authentification** (canal d'acquisition organique)
- **Métadonnées SEO complètes** : `generateMetadata` par article, JSON-LD `schema.org/Article`, sitemap dynamique top 500 par viewCount
- **Robots.txt** ouvert sur `/librairie` (auparavant en disallow)
- **DEMO_MODE** ne masque plus la librairie : démo = prod sur ce point

### Quishing PDF refactor

- **1 page A4** unique au lieu de N pages (l'affiche se duplique à la photocopieuse, pas dans le PDF)
- **Logo entreprise optionnel** uploadable (PNG/JPEG, max 2 MB, validation magic bytes, **non persisté**)
- Token campagne `qhc_<id>` distinct du trackToken per-recipient

### Refonte cosy `/profil`

- **Filtres saison** au-dessus du journal de bord (pattern identique `/librairie`)
- **Aperçu badges** : 5 derniers débloqués + lien vers `/profil/badges`
- **Suppression de la duplication** des modules (3 vues identiques avant, 1 seule maintenant)
- 590 → 483 lignes (−18 %)

### Documentation

- [`docs/PACK_NIS2_V2.md`](./docs/PACK_NIS2_V2.md) - runbook Pack NIS2 v2
- Rapport audit public mis à jour **v1.5** (`/securite/rapport-audit`)

### Tests

- 49 fichiers de tests vitest (`lib/`)
- Couverture critique : auth, NIS2 scoring, CSP nonce, secrets, db-readonly, investigations, audit-flash, markdown

### Infra & deploy

- Image Docker Postgres custom (`docker/postgres/Dockerfile`) avec init script idempotent
- Script `scripts/wipe-content.ts` pour rafraîchir le contenu sans wipe les users
- DEMO_MODE complet (force fallback OSS sur tous les loaders contenu)

---

## [0.3.x] - mai 2026 (pré-launch)

### Sprint 4 - Mode Enquêteur profils (PR #538)
- Profils publics X (`XProfileMockup`) + Instagram (`InstagramProfileMockup`)
- Scène Wi-Fi public

### Sprint 3 - Refonte cosy (PRs #429-#437)
- AdminDashboard 1357 → 147 lignes (Sprint 2)
- Pages admin > 300 lignes : 6 → 0
- Quick Setup Wizard 4 écrans
- Hub `/ressources` (regroupe Cyber-météo, Observatoire fuites, Anecdotes, Audit flash, Librairie, Urgence cyber)
- Refonte page d'accueil 591 → 62 lignes

### Sprint 5 - Télémétrie + cookies RGPD (PR #439)
- Bandeau cookie CNIL 2020-091 (parité stricte Accepter / Refuser)
- Plausible Cloud uniquement avec consentement explicite

---

## [0.2.x] - avril 2026

### Phase 13 - Connecteurs souverains FR
- Sekoia.io (SIEM/XDR)
- HarfangLab (EDR)
- Mailinblack / Vade Secure (anti-phishing)

### Phase 12 - Levier commercial PME FR
- Lucca (HR souverain) - SCIM v2 auto-provisioning
- GLPI (ITSM open-source) - bridge webhook → tickets
- CyberMalveillance.gouv.fr - page liaison

### Phase 11 - Connecteurs SIEM mainstream
- Splunk CIM v1 + connecteur Python HEC
- Microsoft Sentinel CEF + workbook clé en main

### Phase 10 - Standards pivots interop
- OSCAL v1.1.2 (NIST Assessment Results)
- Webhook outbound `evidence.exported` (HMAC-SHA256)
- SCIM v2 complet (Entra / Okta / Google / Keycloak)

### Phase 9 - Passerelle CISO Assistant (intuitem)
- Mapping ISO 27001:2022, NIS2, RGPD, ANSSI HG, NIST CSF
- Endpoint `/api/v1/evidence-export` authentifié + rate-limited
- Page `/integrations/ciso-assistant` + connecteur Python MIT autonome

---

## [0.1.x] - janvier-mars 2026

### Bootstrap & assainissement
- Stack Docker durcie (HAProxy 2.9-alpine, multi-stage, réseaux segmentés)
- Migration souveraine : Scaleway Paris, Mistral, Resend UE, Piper TTS local
- Audit code initial : élimination des bugs critiques (race conditions, fuite multi-tenant)

### Plan-gating & monétisation
- Helper central `lib/plans.ts`
- Server action `switchDemoPlan` (démo immersive sans paiement)
- Bandeau permanent « Vue démo : [plan] »

### Conformité & légal
- Pages légales complètes : mentions, confidentialité, cookies, CGV, CGU
- DPA aligné CNIL (RGPD art. 28)
- Registre des traitements art. 30
- Trust Center `/securite` + audit qualité juridique + WCAG 2.1 AA / RGAA 4.1

### Différenciation commerciale
- Page `/comparatif` honnête
- Mode Présentation CODIR
- Cyber Famille (3 proches gratuits)
- Pack NIS2 par-tenant v1 (4 PDFs signables)
- Multi-établissements light

---

## Roadmap post-v1.0

Cf. [`docs/ROADMAP_PRODUIT_v1.md`](https://github.com/Humanix-Cybersecurity/Humanix-Academie/issues) et issues GitHub.

Chantiers identifiés :
- Hex IA Phases 4-7 (coach, roleplay, voice, agentique)
- Pack NIS2 v3 : snapshots historiques, comparaison cross-tenant anonyme
- Industrialisation observabilité (Prometheus / Grafana)
- Plugin Outlook complet (signed manifest Microsoft Partner)
- Cyber-Mois Octobre 2026

---

**Humanix Académie** est développé par [Humanix-Cybersecurity SASU](https://humanix-cybersecurity.fr) sous licence [AGPL-3.0-or-later](./LICENSE).
