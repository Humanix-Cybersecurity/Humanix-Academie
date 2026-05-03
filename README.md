# Humanix Académie · Community Edition

> La plateforme française **open source** de cybersensibilisation pour PME.
> Code libre AGPLv3 · Hébergement souverain · Brique humaine de l'écosystème
> open source cyber souverain français.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Made in France](https://img.shields.io/badge/Made%20in-France-blue?labelColor=blue&color=red)](https://humanix-cybersecurity.fr)
[![Stack](https://img.shields.io/badge/stack-Next.js%2014%20%C2%B7%20Prisma%20%C2%B7%20PostgreSQL-black)](https://nextjs.org)
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

- **Plateforme web Next.js** multi-tenant, gamifiée, mobile-first
- **5 modules de base inclus** : mots de passe, MFA, phishing, sauvegarde, RGPD
- **Gamification réelle** : XP, badges, mascotte évolutive, classements internes
- **Console dirigeant** : score de risque humain, rapport de conformité PDF, actions recommandées
- **Connecteur natif CISO Assistant** : preuves de conformité exportées automatiquement
- **Format OSCAL v1.1.2** (NIST) + CEF (Sentinel, Splunk, Sekoia, QRadar)
- **API REST** + webhooks signés HMAC-SHA256
- **Mode démo** intégré pour tester sans installer

---

## Démo en ligne

Teste les 3 vues principales sans installation, sans inscription :
**[demo.humanix.fr](https://demo.humanix.fr)**

La base est réinitialisée chaque nuit à 04h00 UTC — tu peux tout cliquer, tout
modifier, tout casser sans crainte.

---

## Quickstart self-host (10 minutes)

### Prérequis

- Docker 24+ et Docker Compose v2
- 2 Go RAM minimum
- 5 Go d'espace disque
- Un nom de domaine (ou `localhost` pour tester)

### Installation

```bash
# 1. Clone le repo
git clone https://github.com/humanix-cybersecurity/humanix-academie.git
cd humanix-academie

# 2. Configure tes variables d'environnement
cp .env.example .env
# Édite .env : DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL, etc.
# Génère un AUTH_SECRET solide :  openssl rand -base64 32

# 3. Démarre la stack (web + postgres + caddy reverse proxy)
docker compose up -d

# 4. Initialise la base de données
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed

# 5. C'est prêt
open http://localhost:3000
```

Premier compte admin : voir le log `docker compose logs app | grep "Initial admin"`.

### Documentation détaillée

- [docs/installation.md](./docs/installation.md) — installation pas-à-pas (Docker, bare-metal, Kubernetes)
- [docs/configuration.md](./docs/configuration.md) — toutes les variables d'environnement
- [docs/upgrade.md](./docs/upgrade.md) — procédure de mise à jour entre versions
- [docs/faq.md](./docs/faq.md) — questions fréquentes self-host

---

## Stack technique

| Couche | Technologie | Pourquoi |
|---|---|---|
| Front + back | **Next.js 14** (App Router) + TypeScript | SSR + API routes dans un seul process |
| Styling | **Tailwind CSS** | Cohérence visuelle, performance, dark mode natif |
| ORM | **Prisma** | Schema-first, type-safe, migrations propres |
| Base | **PostgreSQL 16** | Multi-tenant scoping, indices fins, full-text |
| Auth | **NextAuth.js v5** | SSO Google/Microsoft, magic link, RBAC |
| Charts | **Recharts** | Composants React idiomatiques |
| PDF | **@react-pdf/renderer** | Rapports de conformité côté serveur |
| Container | **Docker** + Compose | Déploiement reproductible |

---

## Open core — ce qui est dans ce repo, ce qui est ailleurs

Humanix Académie suit un modèle **open core**. Le code de la plateforme et 5
modules pédagogiques de base sont open source AGPLv3. Les modules pédagogiques
avancés, le phishing simulé, le Pack NIS2 turnkey et le SSO entreprise sont
proposés en cloud managé ou via une licence commerciale.

| Composant | Statut |
|---|---|
| Plateforme Next.js (engine, dashboard, API, multi-tenant) | Open AGPLv3 (ce repo) |
| 5 modules de base (mots de passe, MFA, phishing, sauvegarde, RGPD) | Open AGPLv3 (ce repo) |
| Gamification engine + mascotte | Open AGPLv3 (ce repo) |
| Connecteur CISO Assistant + format OSCAL | Open AGPLv3 (ce repo) |
| Catalogue 30+ modules avancés | Cloud Essentielle / Pro / Enterprise |
| Phishing simulé (templates + IA Mistral) | Cloud Pro / Enterprise |
| Pack NIS2 turnkey complet | Cloud Pro / Enterprise |
| SSO SAML / SCIM enterprise | Cloud Enterprise |

Tarifs cloud : voir [humanix-cybersecurity.fr/tarifs](https://humanix-cybersecurity.fr/tarifs)

---

## Écosystème — partenaires officiels

Humanix Académie s'inscrit dans l'écosystème open source cyber souverain
français. Intégrations natives ou en cours :

| Outil | Rôle | Statut |
|---|---|---|
| [CISO Assistant](https://github.com/intuitem/ciso-assistant-community) | GRC (gouvernance, risque, conformité) | Connecteur natif |
| [OpenCTI](https://github.com/OpenCTI-Platform/opencti) | Threat intelligence | Roadmap Q3 2026 |
| [Wazuh](https://github.com/wazuh/wazuh) | SIEM / détection | Format CEF |
| [TheHive](https://github.com/TheHive-Project/TheHive) | Réponse à incident | Roadmap Q4 2026 |
| Microsoft Sentinel | SIEM cloud | Workbook fourni |
| Splunk | SIEM | Format HEC + SPL |
| Sekoia.io | XDR français | Format CEF |

---

## Contribuer

Toute contribution est bienvenue : code, documentation, traductions, modules
pédagogiques, retours d'expérience, signalements de vulnérabilité.

- Avant de contribuer : lis [CONTRIBUTING.md](./CONTRIBUTING.md)
- Code de conduite : [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- Vulnérabilités : [SECURITY.md](./SECURITY.md) — disclosure responsable
- Discussions : [GitHub Discussions](https://github.com/humanix-cybersecurity/humanix-academie/discussions)

---

## Modèle économique — comment Humanix vit

La plateforme open source est **gratuite à vie** en self-host. Humanix
Cybersecurity finance le développement par les services à forte valeur ajoutée
qu'elle propose autour :

- **Cloud managé** (à partir de 0 €/mois en Découverte, 19 €/mois en Starter)
- **Audit cybersécurité** et gap analysis NIS2
- **Formation professionnelle** (intra et inter-entreprise, éligible Qualiopi)
- **RSSI externalisé** (forfait mensuel)
- **Pack NIS2 turnkey** + accompagnement à la conformité
- **Intégrations sur-mesure** (Drata, Vanta, ServiceNow, etc.)

C'est le modèle d'intuitem (CISO Assistant), Filigran (OpenCTI) et Centreon —
éprouvé en France, qui finance durablement l'open source.

**Sponsoring (à venir)** : un programme officiel via GitHub Sponsors et
Open Collective sera lancé après le launch du 26 mai 2026. D'ici là, pour
discuter d'un parrainage corporatif ou individuel, contacte
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

| Sujet | Adresse |
|---|---|
| Questions générales | [GitHub Discussions](https://github.com/humanix-cybersecurity/humanix-academie/discussions) |
| Bugs et features | [GitHub Issues](https://github.com/humanix-cybersecurity/humanix-academie/issues) |
| Vulnérabilités sécurité | security@humanix-cybersecurity.fr (voir [SECURITY.md](./SECURITY.md)) |
| Commercial / partenariats | contact@humanix-cybersecurity.fr |
| Site web | https://humanix-cybersecurity.fr |

---

## Remerciements

Humanix Académie n'existerait pas sans :
- L'écosystème **open source cyber français** : intuitem, Filigran, Centreon, OVHcloud, Scaleway
- La communauté **CESIN, OSSIR, CEFCYS** pour le partage d'expérience
- Tous les **dirigeants PME** qui ont accepté d'être pilotes en phase de validation

Et toi, en lisant ce README jusqu'ici. Bienvenue.

---

*Made in France by [Humanix Cybersecurity](https://humanix-cybersecurity.fr)*
