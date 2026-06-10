<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Runbook — Activation de la veille d'exposition B2B (Phase 2)

> **État par défaut : INERTE.** Tout le code de la Phase 2 est livré et testé,
> mais verrouillé. Ce runbook décrit la séquence exacte pour passer de
> « construit, inerte » à « actif », **uniquement** après le 🟢 GO juridique
> (cf. `roadmap.md` § Go / No-Go). Tant qu'une condition manque : **on n'active pas.**

## 0. Pré-requis (les 4 conditions Go/No-Go)

| # | Condition | Preuve | Matérialisé dans le code par |
|---|-----------|--------|------------------------------|
| 1 | DPA art. 28 signé par le tenant | Contrat signé archivé | `Tenant.exposureMonitoringDpaSignedAt` (horodatage, posé via l'UI) |
| 2 | AIPD instanciée | `aipd-trame.md` complétée + validée DPO | Hors-code (dossier conformité) |
| 3 | Notice transparence salariés diffusée | `notice-transparence-salaries.md` diffusée + écran d'info | Hors-code (RH/DPO) |
| 4 | Validation RSSI avant toute notif/assignation | — | `validateAndAssignTraining()` : aucune assignation automatique |

**Si l'une manque → STOP.** Le code reste inerte, c'est volontaire.

## 1. Garde-fous en place (défense en profondeur)

La veille ne s'exécute QUE si la **triple garde** est satisfaite
(`lib/exposure/b2b-flags.ts`, couverte par `b2b-flags.test.ts`) :

1. **Kill switch plateforme** : env `EXPOSURE_B2B_ENABLED === "true"`.
   Absent / différent ⇒ toute la Phase 2 est inerte, quel que soit l'état des tenants.
2. **Opt-in tenant** : `Tenant.exposureMonitoringEnabled === true`.
3. **Gate légal** : `Tenant.exposureMonitoringDpaSignedAt` non nul.
4. (+ au moins un domaine déclaré, sinon rien à surveiller.)

Même avec ces feux verts, le cron **ne fait que DÉTECTER** (`EmployeeExposure`
status `NEW`). Aucune notification, aucune assignation sans **validation RSSI
humaine** dans `/admin/exposition`.

## 2. Séquence d'activation (après GO)

1. **Côté plateforme (exploitant Humanix)** : poser l'env `EXPOSURE_B2B_ENABLED=true`.
   C'est l'ultime garde-fou ; tant qu'elle est absente, rien ne tourne.
2. **Câbler le cron** : le scan n'est planifié nulle part par défaut. Pointer le
   scheduler externe (le même mécanisme `CRON_SECRET` que les autres crons) sur
   `POST /api/cron/exposure-scan`, **1×/jour** suffit. En-tête `x-cron-secret: <CRON_SECRET>`.
   - Vérif à blanc : `GET /api/cron/exposure-scan` renvoie
     `{ globallyEnabled, eligibleTenants }` sans rien scanner.
3. **Côté tenant (RSSI/ADMIN, plan Enterprise)** : dans `/admin/exposition`,
   saisir les domaines de l'organisation + cocher la confirmation **« DPA art. 28
   signé »** + AIPD/notice en place. Cela pose `exposureMonitoringEnabled=true`,
   `exposureMonitoringDpaSignedAt=now()`, `exposureDomains[]` et audite
   `EXPOSURE_MONITORING_ENABLED`.
4. **Exploitation** : le cron crée des `EmployeeExposure` NEW. Le RSSI les
   **valide** (→ formation `exposition-numerique/02-email-dans-une-fuite`
   auto-assignée) ou les **écarte**. Chaque action est auditée.

## 2 bis. Reporting (Phase 3, activé en même temps que la Phase 2)

Une fois la veille active, le reporting suit automatiquement (mêmes gates) :

- **Snapshot quotidien** : le cron `exposure-scan` écrit un `ExposureSnapshot`
  agrégé par tenant et par jour (compteurs par statut + `orgExposureScore`
  0-100). **Aucune donnée individuelle** n'est persistée dans le snapshot.
- **Panneau posture** sur `/admin/exposition` : score, compteurs, mini-tendance.
- **Exports** (boutons admin, gated, audités `EXPOSURE_REPORT_EXPORTED`) :
  - **Rapport de posture** (`.md`) — cadre **NIS2 art.21 / RGPD art.32** (preuve
    de mesure de sécurité). ⚠️ Ce n'est **pas** une notification CNIL art.33 :
    une exposition provient d'une fuite chez un tiers, pas d'une violation du
    tenant. Pour une vraie violation interne → module Cyber-Réflexe.
  - **Export SIEM** (`JSON` / `CEF` ArcSight) — événements `EmployeeExposure`
    du tenant vers son propre SIEM (couvert par le DPA art.28).

## 3. Désactivation / kill

- **Tenant** : bouton « Désactiver la veille » (`exposureMonitoringEnabled=false`,
  audit `EXPOSURE_MONITORING_DISABLED`). L'historique DPA est conservé (traçabilité).
- **Plateforme (kill global)** : retirer `EXPOSURE_B2B_ENABLED`. Effet immédiat :
  triple garde fermée pour TOUS les tenants, cron inerte, aucune validation possible.

## 4. Red lines (NO-GO permanent)

Rappel (`roadmap.md`) : stealer logs sans contrat+AIPD ; réutilisation de données
volées ; scraping de tiers ; scoring individuel disciplinaire ; veille VIP sans
périmètre signé ; notification massive sans validation RSSI. **Donnée d'un tiers
détectée → suppression immédiate** (l'anti-tiers du scan ne traite que les comptes
salariés sur les domaines déclarés).
