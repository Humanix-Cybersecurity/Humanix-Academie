# Changelog — Humanix Académie

Toutes les évolutions notables du produit, classées par version. Conforme
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) +
[SemVer](https://semver.org/lang/fr/).

---

## [1.0.1] — 2026-05-17 🔧 Hotfix popup coordinator

### Fixed

- **HOTFIX critique** `PopupCoordinator` : boucle infinie de re-renders qui freezait le main thread du navigateur (clics non-cliquables, navigation impossible, sans erreur console).
  - Cause : objet `value` du Provider non mémoïsé → `ctx` change à chaque render → cascade de `useEffect` cleanup/register → setState → re-render Provider → loop.
  - Fix : `useMemo` pour la value + pattern subscription explicite + split du hook `usePopupSlot` en 3 effects indépendants (subscribe / setSlot / removeSlot).
  - Cooldown 1.5s déclenché uniquement sur transitions réelles `ready` true→false (plus à chaque update).

Aucun changement fonctionnel attendu pour l'utilisateur final — la mécanique interne du coordinateur a été refondue, l'UX (sequencing, cooldown, suppression sur landing) reste identique à v1.0.0.

Commit : `f019f74` (PR [#562](https://github.com/Humanix-Cybersecurity/Humanix-Academie/pull/562))

---

## [1.0.0] — 2026-05-21 🚀 LAUNCH OSS PUBLIC

> Première version publique sous licence AGPLv3. Tous les chantiers
> stratégiques sont en place : sécurité Zero-Trust, Pack NIS2 v2, Mode
> Enquêteur, librairie SEO publique.

### 🏆 Validation externe — Triple A+ (17 mai 2026)

Trois audits publics indépendants ont validé la posture sécurité avant le launch :

| Scanner | Résultat | Détails |
|---|---|---|
| **Mozilla Observatory** | **A+** | 110/100 · 10/10 tests passés |
| **Security Headers** (Snyk) | **A+** | 6/6 en-têtes HTTP présents (CSP, HSTS, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy) |
| **Qualys SSL Labs** | **A+** | TLS 1.3 · Post-Quantum Cryptography (PQC) key exchange · HSTS long duration |

Tous les rapports sont **rejouables en temps réel** depuis [`/securite/audits-externes`](https://humanix-cybersecurity.fr/securite/audits-externes) — aucune note auto-déclarée.

### Sécurité — Zero-Trust / Least Privilege (Sprint 1-4)

- **RBAC central** (`requireRole()`) sur 30+ routes API admin, plus de patterns dupliqués
- **Filtre PII server-side** dans Hex Chat (anti exfiltration via prompt injection)
- **Client Prisma read-only** dédié aux 5 modules analytiques (forecasts, heatmap, risk-score, at-risk-users, risk-trend) → defense en profondeur SQL
- **CSP nonce per-request** ([Strict CSP](https://csp.withgoogle.com/docs/strict-csp.html) Google) — suppression effective de `unsafe-inline` pour les navigateurs CSP3-aware
- **Page publique `/securite/audits-externes`** — Mozilla Observatory, Security Headers, SSL Labs en lecture directe (transparence radicale)
- **WebAuthn passkey-first UX** sur `/connexion` (préférence mémorisée + badge "Recommandé")
- **Interface `lib/secrets`** — couche d'abstraction pour intégration Vault / Scaleway Secret Manager (préparation, sans migration forcée)
- **Image Docker Postgres custom** `humanix-postgres:secured` qui provisionne automatiquement le rôle SELECT-only au premier boot

→ Détails sécurité disponibles sur demande (audit RSSI / due diligence).

### Pack NIS2 v2 — différenciateur GRC

- **Diagnostic public 30 questions** `/diagnostic-nis2` (gratuit, sans inscription, RGPD-friendly, mappé sur les 11 articles NIS2)
- **Score per-article temps réel** pour tenants, basé sur la complétion des saisons mappées (visible dans `/admin/conformite-nis2`)
- **PDF rapport annuel autorité compétente** (CSIRT / ANSSI) — 3 pages : état des lieux + incidents + sensibilisation + plan + engagement direction
- Mapping `connectors/ciso-assistant-frameworks/mapping-humanix-awareness-to-nis2-directive.yaml` couvrant 11 articles × 12 saisons

→ Cf. [`docs/PACK_NIS2_V2.md`](./docs/PACK_NIS2_V2.md)

### Mode Enquêteur Sprint 3 — apprentissage par découverte

- **30 enquêtes** (3 OSS + 27 commercial) sur 9 types : Email, SMS, LinkedIn, Facebook, X, Instagram, photos bureau / piggyback / poubelle, Wi-Fi public
- **5 rangs Détective** (Aspirant → Cyber Sherlock → Maître Détective) avec seuils 60% / 75% / 90% / 100%
- **Leaderboard 30j** par tenant
- **Trophées partageables LinkedIn / X / clipboard** — chaque rang débloque une page publique `/badges/detective/<rank>` avec OG image dynamique
- **Premier mover marché** : aucun concurrent ne propose ce format

### Librairie — vitrine SEO publique

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

- [`docs/PACK_NIS2_V2.md`](./docs/PACK_NIS2_V2.md) — runbook Pack NIS2 v2
- Rapport audit public mis à jour **v1.5** (`/securite/rapport-audit`)

### Tests

- 49 fichiers de tests vitest (`lib/`)
- Couverture critique : auth, NIS2 scoring, CSP nonce, secrets, db-readonly, investigations, audit-flash, markdown

### Infra & deploy

- Image Docker Postgres custom (`docker/postgres/Dockerfile`) avec init script idempotent
- Script `scripts/wipe-content.ts` pour rafraîchir le contenu sans wipe les users
- DEMO_MODE complet (force fallback OSS sur tous les loaders contenu)

---

## [0.3.x] — mai 2026 (pré-launch)

### Sprint 4 — Mode Enquêteur profils (PR #538)
- Profils publics X (`XProfileMockup`) + Instagram (`InstagramProfileMockup`)
- Scène Wi-Fi public

### Sprint 3 — Refonte cosy (PRs #429-#437)
- AdminDashboard 1357 → 147 lignes (Sprint 2)
- Pages admin > 300 lignes : 6 → 0
- Quick Setup Wizard 4 écrans
- Hub `/ressources` (regroupe Cyber-météo, Observatoire fuites, Anecdotes, Audit flash, Librairie, Urgence cyber)
- Refonte page d'accueil 591 → 62 lignes

### Sprint 5 — Télémétrie + cookies RGPD (PR #439)
- Bandeau cookie CNIL 2020-091 (parité stricte Accepter / Refuser)
- Plausible Cloud uniquement avec consentement explicite

---

## [0.2.x] — avril 2026

### Phase 13 — Connecteurs souverains FR
- Sekoia.io (SIEM/XDR)
- HarfangLab (EDR)
- Mailinblack / Vade Secure (anti-phishing)

### Phase 12 — Levier commercial PME FR
- Lucca (HR souverain) — SCIM v2 auto-provisioning
- GLPI (ITSM open-source) — bridge webhook → tickets
- CyberMalveillance.gouv.fr — page liaison

### Phase 11 — Connecteurs SIEM mainstream
- Splunk CIM v1 + connecteur Python HEC
- Microsoft Sentinel CEF + workbook clé en main

### Phase 10 — Standards pivots interop
- OSCAL v1.1.2 (NIST Assessment Results)
- Webhook outbound `evidence.exported` (HMAC-SHA256)
- SCIM v2 complet (Entra / Okta / Google / Keycloak)

### Phase 9 — Passerelle CISO Assistant (intuitem)
- Mapping ISO 27001:2022, NIS2, RGPD, ANSSI HG, NIST CSF
- Endpoint `/api/v1/evidence-export` authentifié + rate-limited
- Page `/integrations/ciso-assistant` + connecteur Python MIT autonome

---

## [0.1.x] — janvier-mars 2026

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
