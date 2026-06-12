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
- ✅ 5 saisons démo (19 modules) sous `content/saisons-demo/` (reconnaître le phishing, mots de passe, mobile essentiels, maîtrise de l'IA, exposition numérique)
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

Humanix Cybersecurity SASU finance le développement via plusieurs sources
complémentaires :

- **Cloud managé** — instance SaaS sur `humanix-cybersecurity.fr/tarifs`
- **Audit + formation** — RSSI externalisé, audit cyber, formation sur site
- **Pack NIS2 turnkey** — service consulting + livraison documentaire
- **Marketplace** — revenue share avec contributeurs experts
- **Dual-licensing** — pour les éditeurs qui veulent intégrer sans assumer AGPL

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

Le code applicatif est libre AGPLv3. Le **contenu pédagogique** premium
(scénarios crafted par experts, parcours persona-spécifiques) représente
l'effort éditorial qui finance le projet — il est licencié séparément
sous licence commerciale, dans un dépôt distinct.

Solution : **2 repos distincts** + auto-bascule au runtime.

### Architecture

| Repo | Visibilité | Contenu | Licence |
|---|---|---|---|
| `Humanix-Cybersecurity/Humanix-Academie` | **public** | Code + saisons démo génériques + schéma MDX + outils | AGPLv3 (code) + CC BY-SA 4.0 (démos) |
| `Humanix-Cybersecurity/humanix-content-pro` | **privé** | Saisons commerciales + librairie cyber-RH + marketplace officielle + anecdotes | Propriétaire Humanix Cybersecurity |

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
- `Catalogue (commercial) : 33 saisons / 216 episodes` → contenu privé chargé
- `Catalogue (demo) : 5 saisons / 19 episodes` → fork OSS sans le contenu privé

### Workflow opérateur (Humanix Cybersecurity)

**Étape 1 — Créer le repo privé `humanix-content-pro` sur GitHub** (une seule fois).

**Étape 2 — Migrer le contenu commercial** :

Note importante sur la structure cible : on copie **le contenu** de `content/saisons/` (les slugs de saisons) directement sous `content-pro/content/`, sans niveau `saisons/` intermédiaire. Ça simplifie l'arborescence du repo privé (qui n'a qu'un seul type de contenu) et le symlink côté public devient plus court.

```bash
# Copier (PAS déplacer) vers le repo privé
# Le glob copie les sous-dossiers de saisons/ directement sous content-pro/content/
cp -r content/saisons/* ~/humanix-content-pro/content/
cp prisma/catalog-saisons.ts ~/humanix-content-pro/prisma/
cp lib/library-seed.ts ~/humanix-content-pro/lib/
cp lib/marketplace-seed.ts ~/humanix-content-pro/lib/
mkdir -p ~/humanix-content-pro/lib/anecdotes
cp lib/anecdotes/seed-data.ts ~/humanix-content-pro/lib/anecdotes/
```

Arbo finale du repo privé :
```
humanix-content-pro/
├── content/
│   ├── phishing/          ← saisons directement, PAS sous saisons/
│   ├── mots-de-passe/
│   └── ... (33 saisons)
├── prisma/
│   └── catalog-saisons.ts
└── lib/
    ├── library-seed.ts
    ├── marketplace-seed.ts
    └── anecdotes/
        └── seed-data.ts
```

**Étape 3 — Activer le `.gitignore` Open Core dans le repo public** (décommenter le bloc dédié, cf. `.gitignore`).

⚠️ La règle pour `content/saisons` doit être **sans slash final** (`/content/saisons`, pas `/content/saisons/`). Avec slash final, git ne matche que les dossiers, alors qu'après l'étape 5 c'est un symlink — donc un fichier pour git.

**Étape 4 — Retirer du tracking git** (les fichiers restent sur le disque) :

```bash
git rm --cached -r content/saisons
git rm --cached prisma/catalog-saisons.ts
git rm --cached lib/library-seed.ts
git rm --cached lib/marketplace-seed.ts
git rm --cached lib/anecdotes/seed-data.ts
git commit -m "open core: split commercial content to private repo"
```

**Étape 5 — Monter le contenu privé en prod via submodule + symlinks** :

```bash
# 1. Déclarer le submodule (clone le repo privé sous content-pro/)
git submodule add git@github.com:Humanix-Cybersecurity/humanix-content-pro.git content-pro

# 2. Créer les 5 symlinks qui ré-aiguillent les chemins attendus par l'app
#    vers le contenu du submodule. ATTENTION aux chemins relatifs : la cible
#    d'un symlink se résout depuis le dossier qui CONTIENT le symlink.
ln -s ../content-pro/content              content/saisons
ln -s ../content-pro/prisma/catalog-saisons.ts   prisma/catalog-saisons.ts
ln -s ../content-pro/lib/library-seed.ts         lib/library-seed.ts
ln -s ../content-pro/lib/marketplace-seed.ts     lib/marketplace-seed.ts
ln -s ../../content-pro/lib/anecdotes/seed-data.ts lib/anecdotes/seed-data.ts

# 3. Vérification (chaque ligne doit afficher un chemin existant)
readlink -f content/saisons \
            prisma/catalog-saisons.ts \
            lib/library-seed.ts \
            lib/marketplace-seed.ts \
            lib/anecdotes/seed-data.ts
```

⚠️ Pièges constatés à éviter :
1. **Le 1er symlink pointe vers `../content-pro/content`** (pas `../content-pro/content/saisons`) parce que le repo privé n'a pas de niveau `saisons/` intermédiaire (cf. Étape 2).
2. **Le préfixe est `../`** (remonter d'un niveau), pas `content-pro/...` direct — sinon la cible se résout vers `content/content-pro/...` qui n'existe pas.
3. **Pour `lib/anecdotes/seed-data.ts`, c'est `../../`** (deux niveaux à remonter) puisque le symlink vit à deux niveaux de profondeur.

Alternatives au submodule :
- **rsync au déploiement** : `rsync -av ~/humanix-content-pro/ ./content-pro/` puis mêmes symlinks
- **Volume Docker** : monter le contenu commercial via un volume au runtime (`-v $HOME/humanix-content-pro:/app/content-pro:ro`)

### Ce qui change pour qui

| Acteur | Avant | Après |
|---|---|---|
| **Toi (Humanix)** | 1 repo monolithique privé | 2 repos : public (code) + privé (contenu). Submodule pour la prod. |
| **Fork OSS** | N/A (repo privé) | Clone le repo public, obtient **5 saisons démo CC BY-SA**, plateforme fonctionnelle |
| **Client Cloud SaaS** | catalogue complet via `humanix-cybersecurity.fr` | **Inchangé** : tu sers le contenu commercial complet |
| **Client self-host Enterprise** | (cas spécifique) | Contrat + licence Ed25519 → accès au content-pro via submodule, tarball signé ou image Docker (cf. section *Obtenir le content-pro*) |

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
# → log seed : "Catalogue (demo) : 5 saisons / 19 episodes"
# → /apprendre affiche les 5 saisons démo
```

**Sur le repo prod (avec le submodule)** :
```bash
git pull && git submodule update --init
docker compose build --no-cache && docker compose up -d
# → log seed : "Catalogue (commercial) : 33 saisons / 216 episodes"
# → /apprendre affiche le catalogue complet
```

---

## Obtenir le content-pro (clients Enterprise / self-host sous contrat)

Le repo `Humanix-Cybersecurity/humanix-content-pro` est **privé** : il contient l'asset commercial principal (33 saisons / 216 épisodes + librairie + marketplace + anecdotes). Trois cas se présentent :

### Cas 1 — Cloud SaaS sur `humanix-cybersecurity.fr` (zero action)
Tu n'as rien à faire : le contenu commercial est servi par l'instance gérée. Le repo privé n'est même pas exposé — c'est Humanix qui opère.

### Cas 2 — Fork OSS pur (zero action)
Tu clones uniquement le repo public. La plateforme tourne avec les **5 saisons démo CC BY-SA** livrées dans `content/saisons-demo/`. Aucune licence ni démarche requise. Tu peux développer **ton propre catalogue** sous `content/saisons/` (l'app le détectera automatiquement et l'utilisera à la place des démos).

### Cas 3 — Self-host Enterprise avec contenu Humanix complet
Tu veux héberger la plateforme **chez toi** mais avec le catalogue Humanix complet (par exemple : groupe avec contraintes de souveraineté, secteur défense, OPEX critique). C'est un cas **commercial sous contrat** :

1. **Souscription** : tu signes un contrat de licence Humanix Enterprise (`contact@humanix-cybersecurity.fr`). Le contrat précise la durée, le nombre d'utilisateurs et les conditions de mise à jour du contenu.

2. **Émission d'une licence Ed25519** : Humanix te délivre un fichier `license.key` signé avec sa clé privée Ed25519. La clé publique correspondante est embarquée dans le code public (cf. `lib/license.ts`). Cette licence est :
   - **Vérifiable hors-ligne** : pas d'appel réseau à Humanix au démarrage de ton instance.
   - **Liée à ton tenant** : le payload contient ton domaine, ta période de validité, et un quota d'utilisateurs.
   - **Sans télémétrie** : aucune donnée ne nous remonte.

3. **Accès au content-pro** : selon ce qui est négocié au contrat, **au choix** :

   | Mécanisme | Comment | Quand le choisir |
   |---|---|---|
   | **Accès lecture GitHub** | Humanix ajoute ton compte/SSH key en collaborateur lecture sur `humanix-content-pro` | Tu veux les mises à jour automatiques via `git submodule update --remote` |
   | **Tarball signé** | Humanix livre périodiquement `humanix-content-pro-vX.Y.Z.tar.gz` + signature Ed25519 détachée | Réseau air-gapped, infra interdite d'accès GitHub.com |
   | **Volume Docker monté** | Humanix livre une image OCI `humanix/content-pro:vX.Y.Z` à monter en `/app/content-pro:ro` | Stack Docker Swarm/Kubernetes, séparation immutable code/contenu |

4. **Mise en place côté infrastructure** : que tu reçoives le contenu via submodule, tarball ou image OCI, le code attend toujours les **mêmes chemins** au runtime (cf. Étape 5 du workflow opérateur). Les 5 symlinks sont identiques quel que soit le mode de livraison.

5. **Vérification de la licence au démarrage** : au boot de l'app, `lib/license.ts:verifyLicense()` :
   - Lit `LICENSE_KEY` (variable d'env) ou `/etc/humanix/license.key`.
   - Vérifie la signature Ed25519 contre la clé publique embarquée.
   - Vérifie la période de validité et le quota d'utilisateurs.
   - Si la licence est invalide ou absente **mais que le content-pro est présent**, l'app log un warning mais ne bloque pas (mode "self-host non-commercial", l'AGPL te le permet). C'est notre engagement : pas de DRM agressif, juste un mécanisme de preuve commerciale.

### Lien licence ↔ content-pro

| État de la licence | État du content-pro | Comportement attendu |
|---|---|---|
| Présente et valide | Présent (commercial) | Mode commercial Enterprise, log `Catalogue (commercial) : 33 saisons` |
| Absente | Présent (commercial) | App fonctionne, warning licence dans les logs, header `X-Humanix-License: missing` sur les responses internes |
| Présente et valide | Absent | App fonctionne en mode démo (`Catalogue (demo) : 5 saisons`), warning content-pro |
| Absente | Absent | Fork OSS standard, mode démo, aucune mention licence |

> **Pour les ayants droit potentiels** : envoie un mail à `contact@humanix-cybersecurity.fr` avec ton cas d'usage. Réponse sous 48h ouvrées avec devis et conditions.

---

## Questions

- **Communauté** : GitHub Discussions
- **Sécurité / vulnérabilité** : `security@humanix-cybersecurity.fr` (cf. `SECURITY.md`)
- **Commercial / dual-licensing / Enterprise** : `contact@humanix-cybersecurity.fr`

---

**Humanix-Cybersecurity** · Souverain par défaut, libre par conviction, monétisé par expertise.
