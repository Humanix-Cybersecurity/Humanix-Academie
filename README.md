# Humanix Académie · Community Edition

> La plateforme française **open source** de cybersensibilisation pour PME.
> Code libre AGPLv3 · Hébergement souverain · Brique humaine de l'écosystème
> open source cyber souverain français.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Made in France](https://img.shields.io/badge/Made%20in-France-blue?labelColor=blue&color=red)](https://humanix-cybersecurity.fr)
[![Stack](https://img.shields.io/badge/stack-Next.js%2015%20%C2%B7%20React%2019%20%C2%B7%20Prisma%20%C2%B7%20PostgreSQL-black)](https://nextjs.org)
[![CISO Assistant](https://img.shields.io/badge/integrates-CISO%20Assistant-brightgreen)](https://github.com/intuitem/ciso-assistant-community)

---

## Pourquoi Humanix existe

90 % des cyberattaques contre une PME française passent par un humain. Et 90 %
des outils pour former cet humain viennent des États-Unis, sont fermés, et
coûtent 8 000 € par an et plus.

L'écosystème open source cyber français s'est structuré autour d'acteurs
reconnus — **CISO Assistant** (intuitem) pour la gouvernance, **OpenCTI**
(Filigran) pour la threat intelligence, **Wazuh** pour la détection. Mais la
couche humaine, la sensibilisation des collaborateurs, restait un trou béant.

**Humanix Académie est cette brique manquante.** Code libre AGPLv3, hébergement
souverain, intégrée nativement à CISO Assistant.

---

## En 30 secondes

- **Plateforme web Next.js 15 / React 19** multi-tenant, gamifiée, mobile-first
- **27 saisons · 183 modules MDX experts** (phishing, vishing, smishing, quishing, mots de passe, MFA, données sensibles, télétravail, fraude-président, ransomware, IA générative, Cyber-RH, Cyber-Compta, Cyber-Dev, supply chain, NIS2, Sapin II, vie privée bureau, sauvegardes, réseaux Wi-Fi, mobile, visios, stockage cloud, crise cyber, DPO…)
- **Gamification réelle** : XP, badges, mascotte évolutive Hex, classements internes, saisons en accordéon repliable
- **Console dirigeant** dashboard temps-réel : score de risque humain, KPIs business, top performers, urgent actions, rapport conformité PDF, export OSCAL
- **Forecast & analytics avancé** : régression linéaire J+30 sur le score tenant, top movers individuels, corrélation incidents ↔ sensibilisation
- **Espace DPO** : dashboard RGPD interne, file d'effacement art. 17, générateur AIPD, rétention configurable par tenant (art. 5.1.e), counters 90j
- **Quick Setup Wizard** : 4 écrans pour configurer un tenant fresh en <5 min
- **AdminSearchBox** (`Ctrl+K`) : recherche transverse pages + utilisateurs + saisons
- **Cookie consent CNIL-friendly** + Plausible Analytics (config self-host ou cloud)
- **MCP Server** premier mover SAT/HRM (Claude Desktop / Mistral / GPT)
- **Phishing simulé** + **Vishing** + **Smishing** + **Quishing** souverains, IA Mistral, anti-PII automatique
- **Narration audio des modules** : cache MP3 pré-rendu Voxtral (`npm run tts:build`), streaming progressif natif `<audio>`, démarrage <100 ms en cache hit
- **Connecteur natif CISO Assistant** : preuves de conformité exportées automatiquement
- **Format OSCAL v1.1.2** (NIST) + CEF (Sentinel, Splunk, Sekoia, QRadar)
- **API REST** + webhooks signés HMAC-SHA256
- **Stack 100 % souveraine** : hébergement Scaleway Paris, email Scaleway TEM, paiement Payplug, IA Mistral
- **Sécurité défense en profondeur** : CSP strict, middleware edge sur `/admin`, DOMPurify, HSTS preload, anti-SSRF whitelist, anti-PII sur prompts, scrypt + AES-256-GCM
- **Conformité multi-cadre** : RGPD · NIS2 · **Loi Sapin II Art. 17** · ISO 27001:2022 · ANSSI HG · NIST CSF, mapping technique versionné dans [`lib/mapping-grc.ts`](./lib/mapping-grc.ts)
- **Mode démo** + **Mode dev** (bypass Payplug/email) pour tester sans setup externe

---

## Démo en ligne

Teste les 3 vues principales sans installation, sans inscription :
**[humanix-cybersecurity.fr/demo](https://humanix-cybersecurity.fr/demo)**

La base de démonstration est réinitialisée régulièrement — tu peux tout
cliquer, tout modifier, tout casser sans crainte. Comptes pré-remplis pour
les rôles Apprenant, Manager et Admin, plus 5 utilisateurs profilés en
vulnérables / inactifs / top performers pour exercer les vues at-risk et
forecast.

---

## Quickstart dev local (3 minutes) ⚡

```bash
git clone https://github.com/Humanix-Cybersecurity/Humanix-Academie.git
cd humanix-academie
./scripts/start.sh
```

Le script détecte l'OS, installe Docker / mkcert si absents, génère un cert
TLS local trust-safe, prépare `/etc/hosts`, lance la stack en `DEMO_MODE=true`.
Ouvre **`https://humanix.local`** quand c'est terminé.

Détails : [docs/installation.md](./docs/installation.md#mode-0---quickstart-dev-avec-https-local-3-minutes-).

---

## Quickstart self-host (10 minutes)

### Prérequis

- Docker 24+ et Docker Compose v2
- 2 Go RAM minimum
- 5 Go d'espace disque
- Un nom de domaine (ou `localhost` pour tester)

### Installation

```bash
git clone https://github.com/Humanix-Cybersecurity/Humanix-Academie.git
cd humanix-academie

cp .env.example .env
# Édite .env : DATABASE_URL, AUTH_SECRET, AUTH_URL, etc.
# AUTH_SECRET solide :  openssl rand -base64 32

docker compose up -d
```

L'entrypoint synchronise le schéma Prisma, applique la migration legacy plans
(idempotente), seed les données si `DEMO_MODE=true`, bootstrap le 1er admin
selon `BOOTSTRAP_ADMIN_*`, puis démarre Next.js.

Premier compte admin :
- Si `BOOTSTRAP_ADMIN_EMAIL` est configuré → le compte est créé au boot
- Sinon : `docker compose exec app npx tsx scripts/bootstrap-admin.ts`

Par défaut, le tout-premier compte est créé en `SUPERADMIN` (accès cross-tenant,
modération plateforme). Surcharge via `BOOTSTRAP_ADMIN_ROLE` (valeurs :
`SUPERADMIN | ADMIN | RSSI | MANAGER`).

**Promouvoir un compte existant en SUPERADMIN** — si un déploiement antérieur
avait provisionné votre compte avec un rôle inférieur (ex. ancienne version qui
forçait `ADMIN`), réexécutez le bootstrap avec `BOOTSTRAP_ADMIN_EMAIL` pointant
sur votre email :

```bash
docker compose exec app npx tsx scripts/bootstrap-admin.ts
```

Le script détecte que le compte existe déjà et le promeut au rôle demandé. Pas
de modification DB manuelle nécessaire. L'opération est idempotente : un compte
qui a déjà le rôle cible (ou supérieur) reste intact.

### Tâches planifiées (cron)

Pour activer le forecast, les badges, l'observatoire breaches, etc. :

```bash
echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env
docker compose -f docker-compose.yml -f docker-compose.cron.yml up -d ofelia
```

10 tâches HTTP planifiées via Ofelia. Path de migration vers Kubernetes
documenté dans [docs/CRON.md](./docs/CRON.md).

### Documentation détaillée

- [docs/installation.md](./docs/installation.md) — installation pas-à-pas (Docker, bare-metal, Kubernetes)
- [docs/configuration.md](./docs/configuration.md) — toutes les variables d'environnement
- [docs/upgrade.md](./docs/upgrade.md) — procédure de mise à jour entre versions
- [docs/CRON.md](./docs/CRON.md) — tâches planifiées (Ofelia / k8s CronJob)
- [docs/TTS_VOXTRAL.md](./docs/TTS_VOXTRAL.md) — narration audio (Voxtral SaaS ou Piper self-hosted)
- [docs/COMPLIANCE_SAPIN2.md](./docs/COMPLIANCE_SAPIN2.md) — couverture loi Sapin II Art. 17
- [docs/faq.md](./docs/faq.md) — questions fréquentes self-host

---

## Stack technique

| Couche       | Technologie                              | Pourquoi                                         |
| ------------ | ---------------------------------------- | ------------------------------------------------ |
| Front + back | **Next.js 15** (App Router) + React 19   | SSR + API routes + server actions                |
| Langage      | **TypeScript** strict                    | Type-safe end-to-end                             |
| Styling      | **Tailwind CSS**                         | Cohérence visuelle, performance, dark mode natif |
| ORM          | **Prisma 5**                             | Schema-first, type-safe, migrations propres      |
| Base         | **PostgreSQL 16**                        | Multi-tenant scoping, indices fins, full-text    |
| Auth         | **NextAuth.js v5**                       | SSO Google/Microsoft/Apple, magic link, RBAC, 2FA TOTP, WebAuthn |
| Charts       | **Recharts** + SVG inline                | Composants React idiomatiques                    |
| PDF          | **@react-pdf/renderer**                  | Rapports de conformité côté serveur              |
| Container    | **Docker** + Compose                     | Déploiement reproductible                        |
| Cron         | **Ofelia** (V1) → k8s CronJob (V2)       | Tâches planifiées portables                      |
| TTS          | **Voxtral** (Mistral) ou **Piper** local | Narration audio cache content-addressed          |
| Analytics    | **Plausible** (self-host ou cloud)       | RGPD-friendly, sans cookie tracker               |
| Tests        | **Vitest**                               | Logique métier critique sous tests               |

---

## Modes de fonctionnement

3 modes orthogonaux configurables via `.env` :

| Mode | Activation | Effet |
|---|---|---|
| **DEMO_MODE** | `DEMO_MODE=true` | Comptes fictifs pré-seedés via `/demo`, sélecteur 1 clic. Pour démos commerciales / salons. |
| **DEV_MODE** | `DEV_MODE=true` (avec `AUTH_URL` local) | Bypass Payplug + email : inscription auto-login direct, souscription instantanée. Pour tester le vrai flow sans config externe. |
| **Production** | les deux à `false` | Flow réel : email Scaleway TEM, paiement Payplug, magic links signés. |

Garde-fou : `DEV_MODE` est ignoré quand `AUTH_URL` ne pointe pas sur localhost.

---

## Hex Chat — assistant cyber conversationnel

🦊 Hex est un assistant cyber multi-tour, accessible via un FAB flottant
sur toute l'app pour les utilisateurs connectés. Il sait :
- répondre aux questions cyber (phishing, RGPD, NIS2, MFA, mots de passe)
- guider l'utilisation d'Humanix (où trouver un module, exporter un
  certificat, configurer la rétention RGPD)
- refuser poliment les sujets hors-cyber

**Providers supportés** (sélection via `HEX_AI_PROVIDER`) :

| Provider | Coût | Recommandé pour |
|---|---|---|
| `mistral` (défaut) | Free tier Mistral "Experiment" (~1 req/s, 1 B tokens/mois) | Cloud Starter / Pro |
| `ollama` | 0 € (self-host) | Community Edition AGPLv3 |
| `disabled` | — | Désactive le chat (FAB invisible) |

**Rate limit** (par utilisateur) : 12 msg/h en Starter, 60 msg/h en Pro,
200 msg/h en Enterprise. Protège le free tier Mistral sans frustrer les
plans payants.

**Self-host avec Ollama** (gratuit infini, recommandé Community
Edition) :

```bash
# Sidecar Ollama dans docker-compose, modèle Mistral 7B Instruct
docker run -d --name ollama -p 11434:11434 ollama/ollama
docker exec ollama ollama pull mistral:7b-instruct

# Côté app :
HEX_AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
HEX_AI_MODEL=mistral:7b-instruct
```

Roadmap des phases suivantes (RAG sur les 184 modules MDX, coach
personnalisé, roleplay scénarios, voice, agentique) dans le document
`00_Business_Strategie/01_Roadmap_Produit/ROADMAP_HEX_IA.md`.

---

## Narration audio (TTS) — guide express

3 backends au choix selon le contexte :

| Backend | Activation | Use case |
|---|---|---|
| **`voxtral`** (recommandé) | `TTS_PROVIDER=voxtral` + `MISTRAL_API_KEY` | Voix Marie 6 émotions FR Mistral, qualité quasi-humaine, ~$0.0001/mot |
| **`piper`** (option AGPL pure) | `docker compose --profile piper up` + `TTS_PROVIDER=piper` | Self-host total, voix `fr_FR-siwis-medium`, gratuit, RGPD strict |
| `""` (vide, défaut) | rien | Fallback Web Speech API navigateur (gratuit, qualité variable) |

```bash
# Pré-rendre tout le catalogue audio (idempotent, ~10 min, ~$2.50 au 1er run)
docker compose exec app npm run tts:build         # episodes + library articles + teasers
docker compose exec app npm run tts:build:dry     # liste sans appel API
docker compose exec app npm run tts:build:force   # régénération totale (rare)
docker compose exec app npm run tts:prune:apply   # supprime les MP3 orphelins
```

Côté client : `POST /api/tts/prepare` retourne `{ url: "/api/tts/<hash>" }`
content-addressed. Le navigateur stream via `<audio src=...>` avec Range
requests + `Cache-Control: immutable max-age=1an` → **démarrage <100 ms en
cache hit**, sans charger le fichier en RAM.

Où l'audio apparaît :
- 🔊 **Modules** (`/apprendre/<saison>/<episode>`) : « Écouter le scénario / le débrief »
- 🔊 **Articles librairie** (`/librairie/<slug>`) : « Écouter l'article »
- 🔊 **Cartes Cyber Famille** (`/famille`) : mini-bouton « 🔊 Aperçu »
- 🔊 **Vishing admin** (`/admin/vishing`) : sélecteur 4 voix expressives

Runbook : [docs/TTS_VOXTRAL.md](./docs/TTS_VOXTRAL.md).

---

## Open core — ce qui est dans ce repo, ce qui est ailleurs

Humanix Académie suit un modèle **open core**. La plateforme et un sous-ensemble
de modules pédagogiques sont open source AGPLv3. Les modules avancés, le
phishing simulé, le Pack NIS2 turnkey et le SSO entreprise sont proposés en
cloud managé ou via une licence commerciale.

| Composant                                                          | Statut                               |
| ------------------------------------------------------------------ | ------------------------------------ |
| Plateforme Next.js 15 (engine, dashboards, API, multi-tenant)      | Open AGPLv3 (ce repo)                |
| Modules pédagogiques de base (~30 MDX experts)                     | Open AGPLv3 (ce repo)                |
| Gamification engine + mascotte Hex                                 | Open AGPLv3 (ce repo)                |
| Connecteur CISO Assistant + format OSCAL + CEF                     | Open AGPLv3 (ce repo)                |
| Forecast + corrélation incidents (régression linéaire transparente)| Open AGPLv3 (ce repo)                |
| Espace DPO + rétention configurable + AIPD                         | Open AGPLv3 (ce repo)                |
| Quick Setup Wizard + AdminSearchBox                                | Open AGPLv3 (ce repo)                |
| Catalogue 150+ modules avancés                                     | Cloud Pro / Enterprise               |
| Phishing simulé (templates + IA Mistral)                           | Cloud Pro / Enterprise               |
| Quishing campaigns + poster generator                              | Cloud Pro / Enterprise               |
| Pack NIS2 turnkey complet                                          | Cloud Pro / Enterprise               |
| SSO SAML / SCIM enterprise                                         | Cloud Enterprise                     |

Tarifs cloud : voir [humanix-cybersecurity.fr/tarifs](https://humanix-cybersecurity.fr/tarifs).

📖 **Document de référence détaillé** : [`docs/OPEN_CORE.md`](./docs/OPEN_CORE.md) liste exhaustivement ce qui est ouvert vs plan-gated en cloud.

📝 **Contribuer un module pédagogique ?** [`content/community/README.md`](./content/community/README.md) — frontmatter, workflow de review, licence CC BY-SA 4.0.

---

## Tarifs cloud (4 paliers · vente directe sans essai gratuit)

| Palier | Cible | Tarif mensuel | Tarif annuel (−17 à −21 %) |
|---|---|---|---|
| **Découverte** (Starter) | TPE 1-15 personnes | **Gratuit** jusqu'à 5 utilisateurs, puis 19 €/mois forfait | — |
| **Pro** | PME industrialisée 16-250 personnes | 3 €/user/mois | 2,50 €/user/mois |
| **Enterprise** | Multi-sites, secteur réglementé, SecNumCloud | Sur devis | Sur devis |
| **Community Edition** (self-host) | Devs, ESN, RSSI autonomes | **Gratuit à vie** AGPLv3 | — |

La démo en ligne (`/demo`) couvre déjà le besoin "tester avant de payer" —
pas d'essai gratuit sur les paliers payants.

---

## Écosystème — connecteurs techniques

Connecteurs techniques disponibles ou en cours
(aucun partenariat commercial signé à ce jour — les intégrations sont
techniquement prêtes côté Humanix, libre à chaque éditeur de les utiliser) :

| Outil                                                                  | Rôle                                  | Statut           |
| ---------------------------------------------------------------------- | ------------------------------------- | ---------------- |
| [CISO Assistant](https://github.com/intuitem/ciso-assistant-community) | GRC (gouvernance, risque, conformité) | Connecteur natif |
| [OpenCTI](https://github.com/OpenCTI-Platform/opencti)                 | Threat intelligence                   | Roadmap Q3 2026  |
| [Wazuh](https://github.com/wazuh/wazuh)                                | SIEM / détection                      | Format CEF       |
| [TheHive](https://github.com/TheHive-Project/TheHive)                  | Réponse à incident                    | Roadmap Q4 2026  |
| Microsoft Sentinel                                                     | SIEM cloud                            | Workbook fourni  |
| Splunk                                                                 | SIEM                                  | Format HEC + SPL |
| Sekoia.io                                                              | XDR français                          | Format CEF       |

---

## Contribuer

Toute contribution est bienvenue : code, documentation, traductions, modules
pédagogiques, retours d'expérience, signalements de vulnérabilité.

- Avant de contribuer : [CONTRIBUTING.md](./CONTRIBUTING.md)
- Code de conduite : [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- Vulnérabilités : [SECURITY.md](./SECURITY.md) — disclosure responsable
- Discussions : [GitHub Discussions](https://github.com/Humanix-Cybersecurity/Humanix-Academie/discussions)
- Page communauté publique : [humanix-cybersecurity.fr/communaute](https://humanix-cybersecurity.fr/communaute)

### Ton premier PR — par où commencer

1. **Typo / clarification doc** (10 min) — `README.md`, `docs/*.md`. PR directe, review légère.
2. **Module MDX pédagogique** (1-2 h) — il reste des saisons sans MDX expert dans `prisma/catalog-saisons.ts`. Modèle : `content/saisons/phishing/01-mail-du-pdg.mdx`.
3. **Traduction** (1-3 h) — fichiers `messages/<locale>.json` prêts pour i18n.
4. **Connecteur** (1-2 jours) — GRC ou SIEM additionnel (Drata, Vanta, ServiceNow). Modèle dans `connectors/`. Licence MIT.
5. **Module fonctionnel** (2-5 jours) — issues marquées `good first issue` ou roadmap.

### Tests + qualité

```bash
npm run typecheck       # tsc --noEmit (rapide, hook pre-commit dispo)
npm run hooks:install   # active le pre-commit hook typecheck
npm run lint            # ESLint + typecheck + lint-routes
npm test                # Vitest run
npm run test:watch      # Mode watch
npm run test:coverage   # HTML coverage dans ./coverage/index.html
```

Test suite Vitest couvrant la logique critique : auth, plan-gating, billing,
marketplace integrity, scoring CODIR, SCIM mapper, OSCAL, SIEM formatters,
webhooks HMAC + SSRF guard, conformité GRC mapping, audit log, sanitization
HTML, setup wizard. Tournée en CI sur chaque push/PR.

---

## Modèle économique — comment Humanix vit

La plateforme open source est **gratuite à vie** en self-host. Humanix
Cybersecurity finance le développement par les services à forte valeur ajoutée
qu'elle propose autour :

- **Cloud managé** (gratuit jusqu'à 5 sièges, puis 19 €/mois forfait jusqu'à 15)
- **Audit cybersécurité** et gap analysis NIS2 / Sapin II
- **Formation professionnelle** (intra et inter-entreprise, éligible Qualiopi)
- **RSSI externalisé** (forfait mensuel)
- **Pack NIS2 turnkey** + accompagnement à la conformité
- **Intégrations sur-mesure** (Drata, Vanta, ServiceNow, etc.)

C'est le modèle d'intuitem (CISO Assistant), Filigran (OpenCTI) et Centreon —
éprouvé en France, qui finance durablement l'open source.

**Sponsoring** : GitHub Sponsors et Open Collective ouverts après le launch
OSS du 26 mai 2026. Pour discuter d'un parrainage corporatif ou individuel,
`contact@humanix-cybersecurity.fr`.

---

## Licence

Humanix Académie Community Edition est distribuée sous **GNU Affero General
Public License v3.0** (AGPLv3). Voir [LICENSE](./LICENSE) pour le texte
intégral et [COPYRIGHT](./COPYRIGHT) pour la notice de copyright.

**Implications principales** :

- Self-host gratuit, modification interne libre
- Si tu héberges Humanix en SaaS pour des tiers, tu dois **redistribuer le
  code source** (incluant tes modifications) sous AGPLv3
- Tu peux contribuer tes modifications à l'upstream pour profiter à tous

Si tu as besoin d'une **licence commerciale** (par exemple pour un produit
fermé qui embarque Humanix), contacte `contact@humanix-cybersecurity.fr` —
Humanix Cybersecurity propose un dual-licensing au cas par cas.

---

## Contact

| Sujet                     | Adresse                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| Questions générales       | [GitHub Discussions](https://github.com/Humanix-Cybersecurity/Humanix-Academie/discussions) |
| Bugs et features          | [GitHub Issues](https://github.com/Humanix-Cybersecurity/Humanix-Academie/issues)           |
| Vulnérabilités sécurité   | security@humanix-cybersecurity.fr (voir [SECURITY.md](./SECURITY.md))                       |
| Commercial / partenariats | contact@humanix-cybersecurity.fr                                                            |
| Site web                  | https://humanix-cybersecurity.fr                                                            |

---

## Remerciements

Humanix Académie n'existerait pas sans :

- L'écosystème **open source cyber français** : intuitem, Filigran, Centreon, OVHcloud, Scaleway
- La communauté **CESIN, OSSIR, CEFCYS** pour le partage d'expérience
- Tous les **dirigeants PME** qui ont accepté d'être pilotes en phase de validation

Et toi, en lisant ce README jusqu'ici. Bienvenue.

---

_Made in France by [Humanix Cybersecurity](https://humanix-cybersecurity.fr)_
