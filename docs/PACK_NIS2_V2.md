# Pack NIS2 v2 — diagnostic, score per-article, rapport annuel

> Document technique · Version 1.0 · 17 mai 2026
> Récap des chantiers Pack NIS2 v2 livrés en mai 2026.

Le Pack NIS2 a 2 niveaux d'usage côté client :

1. **Pack NIS2 v1** (déjà en place) — 4 documents signables (politique
   sensibilisation, procédure incident 24h/72h, registre formations,
   engagement collaborateur). PDF horodaté multi-pages.
   → `/admin/conformite-nis2` (Pro+ uniquement)

2. **Pack NIS2 v2** (nouveau, mai 2026) — 3 ajouts coordonnés :
   - **Diagnostic public 30 questions** (gratuit, sans inscription)
   - **Score per-article temps réel** (basé sur les données du tenant)
   - **Rapport annuel pour autorité compétente** (PDF formel 3 pages)

---

## 1. Diagnostic public 30 questions

**URL** : `https://<host>/diagnostic-nis2`
**Auth** : aucune (page publique, lead-gen)
**Persistance** : zéro (URL stateless, RGPD-friendly)

### Architecture

- `lib/nis2/questions.ts` — catalogue de 30 questions structurées
  par article NIS2 (21.2.a, 21.2.b, ... 21.2.j, art. 23). Chaque question
  a un poids 1-3 et une aide contextuelle.
- `lib/nis2/articles.ts` — métadonnées des 11 articles (titre, description,
  saisons Humanix qui les couvrent).
- `lib/nis2/scoring.ts` — `computeNis2Diagnostic(answers)` retourne :
  - `globalScore` (0-100)
  - `verdict` (robuste / en_marche / fragile / alerte)
  - `articleScores` (11 entrées)
  - `topPriorities` (3 articles avec le plus gros gap)
- `app/diagnostic-nis2/page.tsx` — wizard single-page, 30 questions
  groupées par article.
- `app/diagnostic-nis2/actions.ts` — encode les réponses en base64url
  dans le query param `?d=...`.
- `app/diagnostic-nis2/resultat/page.tsx` — décode + calcule + rend.

### Lead-gen

L'utilisateur peut renseigner email + nom orga (optionnels). Ils
transitent dans l'URL encodée mais ne sont **jamais persistés**. Si tu
veux capturer les leads, à toi de :

1. Modifier `actions.ts` pour POST l'email + score à un CRM
2. OU envoyer un email "voici votre diagnostic en PDF" avec lien
   signé vers `/api/diagnostic-nis2/pdf?d=...` (à implémenter)

Pour V1, l'utilisateur a son résultat immédiatement à l'écran + URL
partageable au CODIR (le score est dans l'URL).

---

## 2. Score per-article temps réel (tenants)

**URL** : `/admin/conformite-nis2` (Pro+ uniquement)
**Permission** : ADMIN, RSSI, MANAGER (lecture), SUPERADMIN

### Architecture

- `lib/nis2/score-tenant.ts` — `computeTenantNis2Score(tenantId)` :
  - Pour chaque article NIS2, identifie les saisons Humanix mappées
    (cf. `NIS2_ARTICLES[id].coveredBySaisons`)
  - Pour chaque saison mappée, calcule `completion = COMPLETED / (active_users × total_episodes)`
  - Score article = moyenne des completion ratios
  - Score global = moyenne des articles non-N/A
- `components/admin/nis2/Nis2ScoreCard.tsx` — affichage server component
- Intégré dans `app/admin/conformite-nis2/page.tsx` avant le formulaire
  Pack PDF.

### Défense en profondeur

Le module utilise `dbReadOnly` (cf. PR #548 / Sprint 2 sécurité). Si
`DATABASE_URL_READONLY` est configuré, les queries passent par le rôle
Postgres `humanix_ro_user` (SELECT-only). Fallback transparent sinon.

### Codes couleur

| Score | Verdict | Couleur |
|---|---|---|
| ≥ 80 | Robuste | Emerald |
| 60-79 | En marche | Sky blue |
| 40-59 | Fragile | Amber |
| < 40 | Alerte | Red |
| N/A | Aucune saison mappée disponible | Gray |

### Performance

1 query `user.count` + 1 `saison.findMany` + 1 `progress.groupBy`. OK
jusqu'à ~10000 users / tenant. Au-delà, prévoir un cache snapshot
(nightly, comme `RiskScoreSnapshot`).

---

## 3. Rapport annuel pour autorité compétente

**URL** : `GET /api/admin/pack-nis2/annual-report?<params>`
**Permission** : ADMIN, RSSI, MANAGER, SUPERADMIN + plan Pro+

### Bouton dans l'UI

Dans `/admin/conformite-nis2`, le formulaire `PackNis2Form` a maintenant
**2 boutons** qui partagent les mêmes champs identité :
- **"Télécharger le pack PDF"** → 4 documents signables (v1)
- **"Télécharger le rapport annuel NIS2"** → rapport autorité (v2)

### Contenu du PDF (3 pages)

**Page 1 — Couverture + état des lieux**
- Identité de l'entité (raison sociale, SIREN, siège, dirigeant, DPO)
- Période couverte (12 derniers mois par défaut)
- Score global gros (avec verdict)
- Tableau des 11 articles NIS2 avec score per-article

**Page 2 — Incidents + sensibilisation**
- Tableau des incidents déclarés dans la période (depuis `IncidentResponse`)
- "Autorité notifiée" = `anssiNotifiedAt OR cnilNotifiedAt` non null
- Agrégats sensibilisation : apprenants actifs, modules complétés, score
  moyen, campagnes phishing simulé, taux de clic

**Page 3 — Plan + engagement direction**
- 5 chantiers prioritaires (articles avec le score le plus bas)
- Texte d'engagement attestable + signature dirigeant
- Note méthodologique : "ne remplace pas un audit PASSI"

### Paramètres

Query params requis : `tenantName`, `headquarterCity`, `directeurName`,
`directeurTitle`, `directeurEmail`.
Optionnels : `tenantSiren`, `dpoOrReferent`, `periodStart`, `periodEnd`.

### Audit log

Chaque génération est tracée dans `Event` avec type
`nis2_annual_report_generated` + payload `{ periodStart, periodEnd,
globalScore, incidentsCount }`.

---

## Mapping NIS2 ↔ Humanix (source de vérité)

Le mapping article → saisons est dans **un seul fichier** :
`connectors/ciso-assistant-frameworks/mapping-humanix-awareness-to-nis2-directive.yaml`

Pour le code TypeScript, le mapping est dans `lib/nis2/articles.ts`
(synchronisation manuelle, à garder cohérent).

Articles couverts :

| Article | Domaine | Saisons Humanix |
|---|---|---|
| 21.2.a | Politiques d'analyse des risques | nis2-pme, donnees-sensibles |
| 21.2.b | Gestion des incidents | crise-cyber, remediation-flash |
| 21.2.c | Continuité + sauvegardes | ransomware, sauvegardes |
| 21.2.d | Chaîne d'approvisionnement | supply-chain |
| 21.2.e | Dev / acquisition / maintenance | cyber-dev |
| 21.2.f | Évaluation efficacité | nis2-pme |
| 21.2.g | Cyber-hygiène + formation | phishing, mots-de-passe, email-pro, télétravail, cyber-dirigeants, fraude-président, deepfakes, ia-generative |
| 21.2.h | Cryptographie | donnees-sensibles, stockage-cloud |
| 21.2.i | Sécurité RH + contrôle d'accès | cyber-rh, acces-physiques |
| 21.2.j | MFA + authentification | mots-de-passe, visios-meetings |
| 23 | Notification autorité | crise-cyber |

---

## Sources légales

- **Directive (UE) 2022/2555** du 14 décembre 2022 (NIS2)
- **Loi française n° 2024-1039 du 31 octobre 2024** transposition NIS2
- **ANSSI**, guide "Mesures de cyber-sécurité NIS2" du 15 janvier 2025
- **ANSSI**, panorama de la menace 2024

---

## Test plan post-déploiement

- [ ] `https://<host>/diagnostic-nis2` accessible sans auth, 30 questions visibles
- [ ] Soumission du wizard → redirect `/resultat?d=...` avec score
- [ ] `/admin/conformite-nis2` affiche le score per-article (utilisateur Pro+)
- [ ] Bouton "Télécharger le rapport annuel" génère un PDF 3 pages valide
- [ ] PDF contient : score global, tableau articles, incidents (si présents), agrégats sensibilisation, engagement direction
- [ ] Event `nis2_annual_report_generated` créé dans la table `Event`

## À faire plus tard (backlog v3)

- [ ] Persister les leads `/diagnostic-nis2` dans un CRM (HubSpot, Sellsy)
- [ ] PDF du diagnostic public (téléchargeable depuis la page résultat)
- [ ] Snapshot nightly du score per-article (table `Nis2ScoreSnapshot`) pour graphes d'évolution
- [ ] Comparaison cross-tenant anonyme ("vous êtes dans le top X % des PME de votre secteur")
- [ ] Webhook `nis2.report.generated` (intégration CISO Assistant)
