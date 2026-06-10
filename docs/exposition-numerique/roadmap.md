<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Module « Exposition Numérique » — Roadmap & ADR

Module reliant détection d'exposition, conformité et montée en compétence.
Source de vérité versionnée de la roadmap décidée en juin 2026.

## Décisions structurantes (verrouillées)

1. **Check email** = matching souverain contre la base `DataBreach` existante (observatoire des fuites FR). **Pas de HIBP commercial** (HIBP n'offre pas de k-anon email + hébergé US).
2. **Check password** = HIBP Pwned Passwords k-anonymity, hash **côté client**, seul le préfixe 5-chars transite. Seule dépendance US, sans PII.
3. **MVP** = socle commun (Phase 0), puis tier gratuit (Phase 1) et B2B (Phase 2) sur ce socle.
4. **Tier gratuit** = check anonyme/éphémère par défaut ; compte community **opt-in** pour sauvegarder plan + badges.
5. **Veille B2B MVP** = matching domaine sur l'observatoire (pas de stealer logs ; reportés Phase 4 sous contrat).

## Phasage

| Phase | Contenu | Effort | Statut légal |
|---|---|---|---|
| 0 | Socle commun (B2B-ready) | M | 🟢 RAS |
| 1 | Tier gratuit individuel (MVP public) | M-L | 🟢 RAS |
| 2 | **Feature cœur** : boucle exposition → formation auto-assignée → suivi RSSI | L | 🟡 conditionné (cf. Go/No-Go) |
| 3 | Reporting & conformité B2B (NIS2/CNIL/SIEM) | M-L | 🟡 dépend Phase 2 |
| 4 | Veille avancée (e-réputation, VIP, stealer logs) | L+ | 🔴 NO-GO sans contrat+AIPD |
| 5 | Engagement communauté (badges, challenges) | S-M | 🟢 RAS |

## ADR (décisions d'architecture)

- **ADR-1** Pwned Passwords k-anon client-side : le mdp ne quitte jamais le navigateur.
- **ADR-2** Check email via observatoire souverain, pas HIBP commercial : souveraineté totale, couverture = celle de l'observatoire.
- **ADR-3** Vérif propriété email obligatoire (self-check only) : OTP/magic-link avant tout résultat. Anti-doxxing. Réutilise `inscription-intent` + pattern `password-reset`.
- **ADR-4** Stockage éphémère par défaut, chiffré (AES-256-GCM via HKDF `AUTH_SECRET`) sur opt-in B2B.
- **ADR-5** Veille = cron + matching sur données déjà ingérées légalement ; pas de scraping de tiers.
- **ADR-6** Multitenancy B2B = réutilisation `Tenant` + plan-gate + `TenantMembership` + `AuditLog`.
- **ADR-7** Auto-assignation formation = extension de `autoAssignMandatorySaisons()` (plomberie en prod) → risque technique minimal.

## Briques existantes réutilisées

| Besoin | Existant |
|---|---|
| Auto-assignation formation ⭐ | `lib/onboarding/auto-assign.ts`, `app/phishing/[token]/page.tsx` |
| Suivi complétion | `Progress`, dashboards `/admin`, `lib/risk-score.ts` |
| Vérif email | `lib/inscription-intent.ts`, `lib/password-reset.ts` |
| Base fuites + cron | `DataBreach`, `scripts/scrape-breaches.ts`, `app/api/cron/breaches-refresh/` |
| Chiffrement | `lib/smtp/encryption.ts` (template) |
| Plan-gating | `lib/plans.ts`, `lib/tenant-community.ts` |
| Audit | `lib/audit.ts` |
| Conformité DPO | `/admin/dpo/` (générateur AIPD, file effacement art.17) |

## Go / No-Go Phase 2 (B2B)

**🟢 GO** uniquement si les 4 conditions réunies :
1. DPA art. 28 signé par le tenant
2. AIPD instanciée (cf. `aipd-trame.md`)
3. Notice transparence salariés diffusée (cf. `notice-transparence-salaries.md`) + écran d'info en prod
4. Étape de validation RSSI avant toute notification/auto-assignation

**🔴 NO-GO** si l'une manque → on ne livre pas la veille B2B. Le code peut être prêt ; on ne l'active pas sans le juridique.

**Red lines (NO-GO par défaut)** : stealer logs sans contrat+AIPD ; réutilisation de données volées ; scraping de tiers ; scoring individuel disciplinaire ; veille VIP sans périmètre signé ; notification massive sans validation RSSI. Donnée d'un tiers détectée → suppression immédiate.

## Saison de contenu

`content/saisons-demo/exposition-numerique/` — 7 épisodes, déclenchés par type de résultat. Voir `01-mot-de-passe-compromis.mdx` (gabarit livré). Rédaction parallélisable au dev.

## Modèle de données à venir (Phase 2)

```
EmployeeExposure(id, tenantId, userId, breachId, detectedAt,
                 status[NEW|NOTIFIED|TRAINING_ASSIGNED|REMEDIATED],
                 assignedEpisodeId?, resolvedAt?)
ExposureSnapshot(tenantId, day, exposedCount, remediatedCount, orgExposureScore)
RemediationPlan(userId, items Json, createdAt)   // tier gratuit, opt-in compte uniquement
```

Le chemin gratuit anonyme **ne crée aucune ligne**.
