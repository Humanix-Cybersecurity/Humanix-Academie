# Conformité Loi Sapin II — Article 17

> Humanix Académie est, à notre connaissance, la **seule plateforme SAT/HRM
> francophone** qui adresse explicitement les obligations de **formation
> anti-corruption** de la loi Sapin II en plus de la conformité RGPD/NIS2.

## C'est quoi Sapin II et pourquoi c'est notre cheval de bataille

**Loi n° 2016-1691 du 9 décembre 2016** relative à la transparence, à la
lutte contre la corruption et à la modernisation de la vie économique.

L'**Article 17** rend obligatoire pour les entreprises **>500 salariés OU
CA > 100 M€** (et leurs filiales >50 %) la mise en place de **8 mesures
anti-corruption** :

| # | Mesure | Couvert par Humanix |
|---|---|---|
| 1 | Code de conduite | ❌ (rédaction juridique, hors scope) |
| 2 | Dispositif d'alerte interne (whistleblowing) | ❌ (outils dédiés Whispli, etc.) |
| 3 | **Cartographie des risques de corruption** | ✅ Volet humain : score d'exposition à la fraude/manipulation |
| 4 | Procédure d'évaluation des tiers (KYC) | ❌ (outils KYS dédiés) |
| 5 | Procédures de contrôle comptable | ❌ (ERP) |
| 6 | **Dispositif de formation des cadres et personnels exposés** | ✅✅✅ **PILIER CENTRAL HUMANIX** |
| 7 | **Régime disciplinaire** | ✅ Trace tamper-proof acceptation charte cyber + fraude |
| 8 | **Dispositif de contrôle et évaluation interne** | ✅ Taux signalement phishing + rapports trimestriels |

→ Sur les 8 mesures, **4 sont directement couvertes par Humanix** dont **la mesure 6 est notre raison d'être**.

## Sanctions encourues

- **Personne morale** : jusqu'à **1 000 000 €** d'amende
- **Personne physique** (dirigeant) : jusqu'à 200 000 € + peines pénales
- **Contrôles AFA** (Agence française anticorruption) : sur dossier ou inopinés
- **Avertissement public** ou **mise en demeure** publiée sur le site de l'AFA → réputation

L'AFA a déjà publié plusieurs **avertissements publics** pour défaut de programme de formation. C'est un risque concret, pas théorique.

## Ce qu'on couvre concrètement

### Saison « Fraude au président » (déjà au catalogue)

```
content/saisons/fraude-president/
├── 01-mecanisme.mdx           Comment fonctionne l'arnaque (cas Pathé 19M€)
├── 02-faux-virement.mdx       Faux ordre de virement (FOVI)
├── 03-changement-rib.mdx      Faux fournisseur, RIB modifié en urgence
├── 04-deepfake-vocal.mdx      IA voix clonée (cas Arup 25M$)
├── 05-double-validation.mdx   Procédure de validation 4-eyes
└── 06-cas-pathe.mdx           Étude de cas réelle 2018 — 19M€ détournés
```

C'est **exactement** le cœur de cible Sapin II : ces 6 modules forment les
collaborateurs (DAF, comptabilité, RH, exécutifs) aux mécanismes de
manipulation par lesquels la corruption ciblée s'opère.

### Modules complémentaires alignés

| Module | Lien Sapin II |
|---|---|
| `phishing/06-spear-phishing.mdx` | Phishing ciblé exec = vecteur principal de la fraude au président |
| `phishing/05-vishing.mdx` | Appel manipulé du « DAF » exigeant un virement urgent |
| `donnees-sensibles/03-fuite-72h.mdx` | Notification AFA en cas de soupçon de corruption |
| `dpo-quotidien/06-mutualisation-pme.mdx` | Programme conformité partagé inter-PME |

### Génération de preuves pour l'AFA

En cas de contrôle AFA, l'entreprise doit fournir :
1. **Liste des collaborateurs exposés** (DAF, compta, RH, exécutifs)
2. **Preuve de formation** par collaborateur (certificat individuel timestampé)
3. **Score de couverture** (taux de complétion des modules pertinents)
4. **Plan de formation continue** (rappel annuel)

Humanix génère tout ça automatiquement via :

```bash
# Export OSCAL pour import direct dans CISO Assistant
GET /api/v1/evidence-export?framework=SAPIN2&format=oscal-v1

# Rapport PDF dédié pour audit AFA
GET /api/admin/conformity-report?framework=SAPIN2&format=pdf
```

Le mapping technique est dans `lib/mapping-grc.ts → const SAPIN2`.

## Argumentaire commercial DAF

Le DAF (Directeur Administratif et Financier) est **personnellement exposé** aux conséquences d'un défaut Sapin II :
- Co-signature des virements → impliqué dans la chaîne de vérification
- Responsable de la procédure de contrôle interne (mesure 8)
- Premier audité lors d'un contrôle AFA

**Les arguments qui résonnent** :
- « Humanix forme vos équipes compta + RH au coût d'**une journée de la prestation Big Four** »
- « Vous générez les preuves AFA en 3 clics, pas en 3 semaines »
- « La saison Fraude au Président est plus précise que les modules Sapin II génériques des concurrents (cas Pathé, cas Arup, deepfake vocal) »
- « Mistral Voxtral simule un appel vishing crédible — vos managers entendent CE que vraisemblablement ils entendront »

## Périmètre out-of-scope (à dire honnêtement)

Humanix **ne se substitue pas** à :
- **Compliance Officer** (humain, pour décider du périmètre + revoir les cas)
- **Outils GRC** (CISO Assistant, Eramba, MetricStream — pour suivre les contrôles 1, 4, 5)
- **ERP financier** (Sage, SAP — pour la mesure 5 contrôle comptable)
- **Plateforme whistleblowing** (Whispli, EQS — pour la mesure 2)

On est **complémentaires**. La table de mapping `lib/mapping-grc.ts` documente
explicitement ce qu'on couvre (`controls`) et ce qu'on ne couvre pas (`outOfScope`)
pour éviter toute surcote.

## Liens utiles

- Texte de loi : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000033558528/
- AFA — Recommandations 2021 : https://www.agence-francaise-anticorruption.gouv.fr/
- Référentiel AFA évaluation des tiers : https://www.agence-francaise-anticorruption.gouv.fr/fr/recommandations
- ISO 37001 (système de management anti-corruption, complémentaire) : https://www.iso.org/standard/65034.html

## Roadmap

| Item | Statut |
|---|---|
| Framework `SAPIN2` dans `lib/mapping-grc.ts` | ✅ |
| Saison fraude-president (6 modules) | ✅ |
| Export OSCAL `framework=SAPIN2` | ✅ (via `/api/v1/evidence-export`) |
| Rapport PDF dédié AFA | ⏳ (générique fonctionne, dédié à venir) |
| Module « Plan de formation continue » avec rappels annuels | ⏳ |
| Intégration native CISO Assistant pour Sapin II | ⏳ (ISO/NIS2 déjà OK, ajout Sapin II Q3 2026) |
| Saison dédiée « Whistleblowing safe » (mesure 2) | ⏳ |
