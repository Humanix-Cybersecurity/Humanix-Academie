# Modèle Open Core — Humanix Académie

> **Document de référence** · publié pour transparence avant le launch OSS du 26 mai 2026.

Humanix Académie suit un modèle **open core service-led**. Le code est intégralement public sous AGPLv3 ; les revenus viennent de l'expertise, du cloud managé, et d'options Premium activées par plan.

Ce document liste de manière transparente **ce qui est ouvert** et **ce qui requiert un plan payant**, pour qu'un RSSI ou un contributeur sache exactement à quoi s'attendre.

---

## Ce qui est OUVERT (Community Edition, AGPLv3)

100 % du code de la plateforme est dans ce repo, exécutable en self-host sans appeler aucun serveur Humanix. Inclus :

### Plateforme
- ✅ Application Next.js complète (front + back + API)
- ✅ Schema Prisma multi-tenant complet
- ✅ Système d'auth NextAuth (magic link Resend, SSO Google, SSO Microsoft)
- ✅ Internationalisation prête (FR par défaut, structure i18n)
- ✅ Mascotte Hex évolutive (level + boutique + customisation)
- ✅ Rate limiting + audit trail + CSP stricte

### Sensibilisation
- ✅ Player de modules MDX avec scénarios + quiz + debrief
- ✅ 5 modules de base sous `content/saisons/` (phishing, mots de passe, données sensibles, télétravail, RGPD)
- ✅ Mécanique de progression XP / streak / level
- ✅ Cyber-Anecdote du Lundi (newsletter pédagogique)
- ✅ Cyber-Réflexe / réponse à incident
- ✅ Cyber Famille (3 proches gratuits)
- ✅ Système de classement par tenant
- ✅ Posters PDF mensuels (12 thèmes/an)
- ✅ Audit Flash gratuit (5 min)

### Conformité
- ✅ Pack NIS2 lite (templates registres, procédures, déclaration)
- ✅ Score de risque humain par utilisateur (User.riskScore)
- ✅ Page `/securite` (Trust Center) + rapport d'audit public
- ✅ Cyber-météo France (CERT-FR)
- ✅ Observatoire fuites de données françaises
- ✅ Calcul ROI cyber en €

### Standards et intégrations
- ✅ API REST publique avec clés API + rate limit + audit
- ✅ Webhooks signés HMAC-SHA256 (SSRF-safe)
- ✅ Format OSCAL v1.1.2 (NIST Assessment Results)
- ✅ Format ArcSight CEF v1 (Sentinel/QRadar/Sekoia compatible)
- ✅ Format Splunk CIM v1 (HEC compatible)
- ✅ SCIM v2 (RFC 7643/7644 — Entra/Okta/Google/Keycloak)
- ✅ Hub `/integrations` complet
- ✅ MCP Server (Model Context Protocol) — `connectors/mcp-server/` MIT

### Connecteurs (sous-projets MIT autonomes)
- ✅ CISO Assistant (intuitem) — `connectors/ciso-assistant/`
- ✅ Microsoft Sentinel — `connectors/sentinel/` + workbook
- ✅ Splunk HEC — `connectors/splunk/` + queries SPL
- ✅ Sekoia.io — `connectors/sekoia/`
- ✅ HarfangLab — `connectors/harfanglab/`
- ✅ Mailinblack / Vade — `connectors/mailinblack-vade/`
- ✅ Lucca (HR FR) — `connectors/lucca/`
- ✅ GLPI (ITSM FR) — `connectors/glpi/`
- ✅ MCP Server (premier mover SAT/HRM) — `connectors/mcp-server/`

### Marketplace
- ✅ Le moteur de marketplace est dans le code
- ✅ Le dossier `content/community/` est ouvert aux contributions
- ⚠️ La marketplace UI est **gated palier Pro+** côté plateforme cloud (cf. `FEATURE_MIN_PLAN.marketplace` dans `lib/plans.ts`). En self-host self-hosted, tu peux désactiver le gate.

---

## Ce qui requiert un plan payant (Cloud SaaS uniquement, ou contrat Enterprise)

Ces features sont **dans le même code source** mais le runtime applique un plan-gating via `lib/plans.ts:FEATURE_MIN_PLAN`. Sur la version cloud SaaS d'`humanix-cybersecurity.fr`, elles sont activées selon ton plan ; en self-host, tu peux les activer librement (l'AGPL te le permet).

| Feature                               | Plan minimum  | Pourquoi                                                                 |
| ------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| API REST publique + clés API          | Essentielle   | Coût opérationnel (rate limit, audit, support)                           |
| SCIM v2 auto-provisioning             | Essentielle   | Idem                                                                     |
| Webhooks sortants signés              | Essentielle   | Idem                                                                     |
| Phishing simulé (campagnes)           | Pro           | Effort produit + responsabilité accrue                                   |
| Phishing IA personnalisé (Mistral)    | Pro           | Coût d'inférence Mistral cloud                                            |
| Vishing IA souverain (Mistral + Piper)| Pro           | Idem                                                                     |
| IA Coach Hex enrichi par LLM          | Pro           | Idem                                                                     |
| Challenges d'équipe                   | Pro           | Effort produit                                                           |
| Cyber-Réflexe (réponse à incident)    | Pro           | Effort produit + workflows critiques                                     |
| Marketplace de modules                | Pro           | Validation contenus + modération                                         |
| Multi-établissements (filiales)       | Premium       | Cas d'usage Enterprise                                                   |
| SSO entreprise (SAML 2.0)             | Premium       | Cas d'usage Enterprise                                                   |
| White-label (logo + couleurs)         | Premium       | Cas d'usage Enterprise                                                   |
| Pack NIS2 turnkey complet             | Pro           | Effort consultant + responsabilité juridique                             |

**Important : en self-host AGPLv3, tu peux activer toutes ces features.** Le plan-gating est une convention commerciale du SaaS Humanix Académie, pas une restriction technique opposable. Il suffit de modifier `lib/plans.ts:FEATURE_MIN_PLAN` ou de désactiver la fonction `planHasFeature`. C'est l'esprit AGPL.

Si tu veux héberger pour un client en marque blanche commercialement, c'est possible aussi — mais respecte l'AGPLv3 (publie tes modifs si tu sers le code en SaaS) ou contacte-nous pour un dual-licensing.

---

## Modèle économique

| Source de revenus     | % cible 2026 | Description                                                                |
| --------------------- | ------------ | -------------------------------------------------------------------------- |
| Cloud managé          | 40 %         | `humanix-cybersecurity.fr/tarifs` — paliers Découverte / Solo / Essentielle / Pro / Premium |
| Audit + formation     | 30 %         | Prestations menées par Humanix-Cybersecurity (RSSI externalisé, audit cyber, formation sur site) |
| Pack NIS2 turnkey     | 15 %         | Service consulting + livraison documentaire pour passer NIS2 en 30 jours   |
| Marketplace           | 10 %         | Revenue share avec contributeurs experts (50/50 sur les modules payants)   |
| Dual-licensing        | 5 %          | Cas où un éditeur tiers veut intégrer Humanix sans assumer l'AGPL          |

Cible 24 mois : **180 à 250 k€** en solo bootstrap.

---

## Position sur le fork hostile

L'AGPLv3 protège contre le fork commercial fermé : si un acteur prend le code et l'héberge en SaaS commercial, il **doit** publier ses modifs sous AGPLv3.

Ce qui n'est PAS protégé : un fork qui change le branding et propose la même chose en plus cher. Notre défense ici est :
- **La marque** (`Humanix Académie` est protégée — cf. `TRADEMARK.md`)
- **Le service** (audit, formation, RSSI externalisé sont notre vrai métier)
- **L'écosystème** (être le partenaire FR de référence pour CISO Assistant et la stack souveraine)

Si tu veux forker, **fais-le ouvertement** : ajoute ton repo dans la marketplace, contribue tes améliorations, et qu'on bénéficie tous de l'écosystème.

---

## Questions

- **Communauté** : GitHub Discussions
- **Sécurité / vulnérabilité** : `security@humanix-cybersecurity.fr` (cf. `SECURITY.md`)
- **Commercial / dual-licensing / Enterprise** : `contact@humanix-cybersecurity.fr`

---

**Humanix-Cybersecurity** · Souverain par défaut, libre par conviction, monétisé par expertise.
