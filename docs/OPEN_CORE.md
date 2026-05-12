# Modèle Open Core - Humanix Académie

> **Document de référence** · publié pour transparence avant le launch OSS du 26 mai 2026.

Humanix Académie suit un modèle **open core service-led**. Le code est intégralement public sous AGPLv3 ; les revenus viennent de l'expertise, du cloud managé, et d'options Premium activées par plan.

Ce document liste de manière transparente **ce qui est ouvert** et **ce qui requiert un plan payant**, pour qu'un RSSI ou un contributeur sache exactement à quoi s'attendre.

---

## Ce qui est OUVERT (Community Edition, AGPLv3)

100 % du code de la plateforme est dans ce repo, exécutable en self-host sans appeler aucun serveur Humanix. Inclus :

### Plateforme
- ✅ Application Next.js complète (front + back + API)
- ✅ Schema Prisma multi-tenant complet
- ✅ Système d'auth NextAuth (magic link Scaleway TEM, SSO Google, SSO Microsoft)
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
- ✅ SCIM v2 (RFC 7643/7644 - Entra/Okta/Google/Keycloak)
- ✅ Hub `/integrations` complet
- ✅ MCP Server (Model Context Protocol) - `connectors/mcp-server/` MIT

### Connecteurs (sous-projets MIT autonomes)
- ✅ CISO Assistant (intuitem) - `connectors/ciso-assistant/`
- ✅ Microsoft Sentinel - `connectors/sentinel/` + workbook
- ✅ Splunk HEC - `connectors/splunk/` + queries SPL
- ✅ Sekoia.io - `connectors/sekoia/`
- ✅ HarfangLab - `connectors/harfanglab/`
- ✅ Mailinblack / Vade - `connectors/mailinblack-vade/`
- ✅ Lucca (HR FR) - `connectors/lucca/`
- ✅ GLPI (ITSM FR) - `connectors/glpi/`
- ✅ MCP Server (premier mover SAT/HRM) - `connectors/mcp-server/`

### Marketplace
- ✅ Le moteur de marketplace est dans le code
- ✅ Le dossier `content/community/` est ouvert aux contributions
- ⚠️ La marketplace UI est **gated palier Pro+** côté plateforme cloud (cf. `FEATURE_MIN_PLAN.marketplace` dans `lib/plans.ts`). En self-host self-hosted, tu peux désactiver le gate.

---

## Ce qui requiert un plan payant (Cloud SaaS uniquement, ou contrat Enterprise)

Ces features sont **dans le même code source** mais le runtime applique un plan-gating via `lib/plans.ts:FEATURE_MIN_PLAN`. Sur la version cloud SaaS d'`humanix-cybersecurity.fr`, elles sont activées selon ton plan ; en self-host, tu peux les activer librement (l'AGPL te le permet).

| Feature                               | Plan minimum  | Pourquoi                                                                 |
| ------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| API REST publique + clés API          | Pro           | Coût opérationnel (rate limit, audit, support)                           |
| SCIM v2 auto-provisioning             | Pro           | Idem                                                                     |
| Webhooks sortants signés              | Pro           | Idem                                                                     |
| Phishing simulé (campagnes)           | Pro           | Effort produit + responsabilité accrue                                   |
| Phishing IA personnalisé (Mistral)    | Pro           | Coût d'inférence Mistral cloud                                            |
| Vishing IA souverain (Mistral + Piper)| Pro           | Idem                                                                     |
| Smishing IA souverain (Mistral SMS)   | Pro           | Idem                                                                     |
| IA Coach Hex enrichi par LLM          | Pro           | Idem                                                                     |
| Challenges d'équipe                   | Pro           | Effort produit                                                           |
| Cyber-Réflexe (réponse à incident)    | Pro           | Effort produit + workflows critiques                                     |
| Marketplace de modules                | Pro           | Validation contenus + modération                                         |
| Multi-établissements (filiales)       | Premium       | Cas d'usage Enterprise                                                   |
| SSO entreprise (SAML 2.0)             | Premium       | Cas d'usage Enterprise                                                   |
| White-label (logo + couleurs)         | Premium       | Cas d'usage Enterprise                                                   |
| Pack NIS2 turnkey complet             | Pro           | Effort consultant + responsabilité juridique                             |

**Important : en self-host AGPLv3, tu peux activer toutes ces features.** Le plan-gating est une convention commerciale du SaaS Humanix Académie, pas une restriction technique opposable. Il suffit de modifier `lib/plans.ts:FEATURE_MIN_PLAN` ou de désactiver la fonction `planHasFeature`. C'est l'esprit AGPL.

Si tu veux héberger pour un client en marque blanche commercialement, c'est possible aussi - mais respecte l'AGPLv3 (publie tes modifs si tu sers le code en SaaS) ou contacte-nous pour un dual-licensing.

---

## Modèle économique

| Source de revenus     | % cible 2026 | Description                                                                |
| --------------------- | ------------ | -------------------------------------------------------------------------- |
| Cloud managé          | 40 %         | `humanix-cybersecurity.fr/tarifs` - paliers Starter / Pro / Enterprise |
| Audit + formation     | 30 %         | Prestations menées par Humanix-Cybersecurity (RSSI externalisé, audit cyber, formation sur site) |
| Pack NIS2 turnkey     | 15 %         | Service consulting + livraison documentaire pour passer NIS2 en 30 jours   |
| Marketplace           | 10 %         | Revenue share avec contributeurs experts (50/50 sur les modules payants)   |
| Dual-licensing        | 5 %          | Cas où un éditeur tiers veut intégrer Humanix sans assumer l'AGPL          |

Cible 24 mois : **180 à 250 k€** en solo bootstrap.

---

## Position sur le fork hostile

L'AGPLv3 protège contre le fork commercial fermé : si un acteur prend le code et l'héberge en SaaS commercial, il **doit** publier ses modifs sous AGPLv3.

Ce qui n'est PAS protégé : un fork qui change le branding et propose la même chose en plus cher. Notre défense ici est :
- **La marque** (`Humanix Académie` est protégée - cf. `TRADEMARK.md`)
- **Le service** (audit, formation, RSSI externalisé sont notre vrai métier)
- **L'écosystème** (être le partenaire FR de référence pour CISO Assistant et la stack souveraine)

Si tu veux forker, **fais-le ouvertement** : ajoute ton repo dans la marketplace, contribue tes améliorations, et qu'on bénéficie tous de l'écosystème.

---

## Séparation physique du contenu commercial (mai 2026)

> Section ajoutée en préparation du passage public du 26 mai 2026.

### Pourquoi

Le code applicatif est libre AGPLv3. Le **contenu pédagogique** (159 modules MDX, 27 saisons, 1.8 MB) représente plusieurs mois d'effort éditorial — il **ne doit pas** être distribué gratuitement avec la version OSS, sinon le revenu du SaaS s'effondre.

Solution : **2 repos distincts** + auto-bascule au runtime.

### Architecture

| Repo | Visibilité | Contenu | Licence |
|---|---|---|---|
| `Humanix-Cybersecurity/Humanix-Academie` | **public** | Code + 2 saisons démo génériques (6 modules) + schéma MDX + outils | AGPLv3 (code) + CC BY-SA 4.0 (démos) |
| `Humanix-Cybersecurity/humanix-content-pro` | **privé** | 27 saisons × 6 épisodes (159 MDX) + catalogues + librairie + marketplace + anecdotes | Propriétaire Humanix Cybersecurity |

**Volume privé** : ~5 515 lignes de seeds + 1.8 MB de MDX = l'asset commercial principal.

### Mécanisme de bascule automatique

Le code détecte la présence du contenu privé et bascule sans config :

```ts
// lib/episodes.ts — résolution du content root
function resolveContentRoot(): string | null {
  if (fs.existsSync(CONTENT_ROOT_PRO)) {
    const entries = fs.readdirSync(CONTENT_ROOT_PRO, { withFileTypes: true })
      .filter((d) => d.isDirectory());
    if (entries.length > 0) return CONTENT_ROOT_PRO;       // catalogue commercial
  }
  if (fs.existsSync(CONTENT_ROOT_DEMO)) return CONTENT_ROOT_DEMO;  // fallback OSS
  return null;
}

// prisma/seed-data-loader.ts — résolution du catalog au seeding
export function loadCatalogSaisons() {
  const pro = tryRequire("./catalog-saisons");
  if (pro?.CATALOG_SAISONS?.length) {
    return { saisons: pro.CATALOG_SAISONS, source: "commercial" };
  }
  return { saisons: CATALOG_SAISONS_DEMO, source: "demo" };
}
```

Au seeding, le log indique la source :
- `Catalogue (commercial) : 27 saisons / 159 episodes` → contenu privé chargé
- `Catalogue (demo) : 2 saisons / 6 episodes` → fork OSS sans le contenu privé

### Workflow opérateur (Humanix Cybersecurity)

**Étape 1 — Créer le repo privé `humanix-content-pro` sur GitHub** (une seule fois).

**Étape 2 — Migrer le contenu commercial** :

```bash
# Copier (PAS déplacer) vers le repo privé
cp -r content/saisons ~/humanix-content-pro/content/
cp prisma/catalog-saisons.ts ~/humanix-content-pro/prisma/
cp lib/library-seed.ts ~/humanix-content-pro/lib/
cp lib/marketplace-seed.ts ~/humanix-content-pro/lib/
cp -r lib/anecdotes/seed-data.ts ~/humanix-content-pro/lib/anecdotes/
```

**Étape 3 — Activer le `.gitignore` Open Core dans le repo public** (décommenter le bloc dédié, cf. `.gitignore`).

**Étape 4 — Retirer du tracking git** (les fichiers restent sur le disque) :

```bash
git rm --cached -r content/saisons
git rm --cached prisma/catalog-saisons.ts
git rm --cached lib/library-seed.ts
git rm --cached lib/marketplace-seed.ts
git rm --cached lib/anecdotes/seed-data.ts
git commit -m "open core: split commercial content to private repo"
```

**Étape 5 — Monter le contenu privé en prod** (au choix) :
- **Submodule git** : `git submodule add git@github.com:Humanix-Cybersecurity/humanix-content-pro.git content-pro` + symlinks
- **Copie au déploiement** : `rsync` du repo privé vers le serveur prod
- **Volume Docker** : monter le contenu via un volume au runtime

### Ce qui change pour qui

| Acteur | Avant | Après |
|---|---|---|
| **Toi (Humanix)** | 1 repo monolithique privé | 2 repos : public (code) + privé (contenu). Submodule pour la prod. |
| **Fork OSS** | N/A (repo privé) | Clone le repo public, obtient **2 saisons démo CC BY-SA**, plateforme fonctionnelle |
| **Client Cloud SaaS** | catalogue complet via `humanix-cybersecurity.fr` | **Inchangé** : tu sers le contenu commercial complet |
| **Client self-host Enterprise** | (cas spécifique) | Tu peux livrer le contenu via un tarball signé ou un accès lecture au repo privé selon contrat |

### Surface technique modifiée

| Fichier | Rôle |
|---|---|
| `content/saisons-demo/` | **Nouveau** : 6 MDX démo CC BY-SA (mots-de-passe-bases × 3 + reconnaitre-phishing × 3) |
| `prisma/catalog-saisons-demo.ts` | **Nouveau** : catalogue des saisons démo (2 entries) |
| `prisma/catalog-saisons-shared.ts` | **Nouveau** : types `CatalogSaison` + helpers `rewardsFor` + `validateCatalog(saisons)` |
| `prisma/seed-data-loader.ts` | **Nouveau** : loaders avec fallback gracieux (catalog, library, marketplace, anecdotes) |
| `lib/episodes.ts` | **Modifié** : `resolveContentRoot()` qui bascule auto entre `content/saisons/` et `content/saisons-demo/` |
| `prisma/seed.ts` | **Modifié** : utilise les loaders au lieu d'imports statiques |
| `.gitignore` | **Modifié** : bloc Open Core (commenté par défaut, à activer avant passage public) |

### Test de validation

**Sur le repo public seul (sans le contenu privé)** :
```bash
git clone https://github.com/Humanix-Cybersecurity/Humanix-Academie.git fork-test
cd fork-test
docker compose up -d
# → log seed : "Catalogue (demo) : 2 saisons / 6 episodes"
# → /apprendre affiche les 2 saisons démo
```

**Sur le repo prod (avec le submodule)** :
```bash
git pull && git submodule update --init
docker compose build --no-cache && docker compose up -d
# → log seed : "Catalogue (commercial) : 27 saisons / 159 episodes"
# → /apprendre affiche le catalogue complet
```

---

## Questions

- **Communauté** : GitHub Discussions
- **Sécurité / vulnérabilité** : `security@humanix-cybersecurity.fr` (cf. `SECURITY.md`)
- **Commercial / dual-licensing / Enterprise** : `contact@humanix-cybersecurity.fr`

---

**Humanix-Cybersecurity** · Souverain par défaut, libre par conviction, monétisé par expertise.
