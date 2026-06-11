// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Phase 3 (B2B reporting) — rapport de POSTURE d'exposition.
//
// CADRAGE JURIDIQUE VOLONTAIRE : ce rapport documente une MESURE DE SÉCURITÉ
// (surveillance + remédiation des comptes exposés) au sens NIS2 art.21 et
// RGPD art.32. Ce n'est PAS une notification de violation de données :
// une exposition détectée vient d'une fuite chez un TIERS, ce n'est pas une
// violation du tenant -> aucun gabarit CNIL art.33 ici (ce serait juridiquement
// incorrect et risqué). Le rapport est agrégé (0 PII individuelle).

import { db } from "@/lib/db";
import { isB2bMonitoringActive } from "@/lib/exposure/b2b-flags";

export type ComplianceReport =
  | { ok: true; generatedAt: string; markdown: string }
  | { ok: false; reason: "inactive" | "no_tenant" };

function fmtDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function trendArrow(prev: number | null, cur: number): string {
  if (prev === null) return "—";
  if (cur > prev) return `▲ +${cur - prev}`;
  if (cur < prev) return `▼ ${cur - prev}`;
  return "= 0";
}

/** Construit le rapport de posture (markdown). Gated triple garde. */
export async function buildComplianceReport(
  tenantId: string,
): Promise<ComplianceReport> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      exposureMonitoringEnabled: true,
      exposureMonitoringDpaSignedAt: true,
      exposureDomains: true,
    },
  });
  if (!tenant) return { ok: false, reason: "no_tenant" };
  if (!isB2bMonitoringActive(tenant)) return { ok: false, reason: "inactive" };

  const snapshots = await db.exposureSnapshot.findMany({
    where: { tenantId },
    orderBy: { day: "desc" },
    take: 30,
  });

  const latest = snapshots[0] ?? null;
  const previous = snapshots[1] ?? null;
  const generatedAt = new Date().toISOString();

  const remediationRate =
    latest && latest.remediatedCount + latest.exposedCount > 0
      ? Math.round(
          (latest.remediatedCount /
            (latest.remediatedCount + latest.exposedCount)) *
            100,
        )
      : null;

  // Historique condensé (du plus ancien au plus récent) pour la tendance.
  const history = [...snapshots]
    .reverse()
    .map(
      (s) =>
        `| ${fmtDay(s.day)} | ${s.exposedCount} | ${s.remediatedCount} | ${s.orgExposureScore}/100 |`,
    )
    .join("\n");

  const md = `# Rapport de posture — Veille d'exposition

**Organisation :** ${tenant.name}
**Date du rapport :** ${generatedAt.slice(0, 10)}
**Périmètre surveillé :** ${tenant.exposureDomains.join(", ") || "(aucun domaine)"}
**DPA art. 28 :** signé le ${tenant.exposureMonitoringDpaSignedAt ? fmtDay(tenant.exposureMonitoringDpaSignedAt) : "—"}

> ⚖️ **Nature de ce document.** Ce rapport atteste d'une **mesure de sécurité**
> (surveillance et remédiation des comptes salariés exposés dans des fuites
> publiques de tiers) au titre de **NIS2 art. 21** et **RGPD art. 32**. Il ne
> constitue **pas** une notification de violation de données : une exposition
> détectée provient d'une fuite chez un tiers et n'est pas, en soi, une
> violation imputable à ${tenant.name}. Pour une véritable violation interne,
> se référer au module Cyber-Réflexe (notification CNIL art. 33 / ANSSI).

## Posture actuelle

${
  latest
    ? `- **Score de posture :** ${latest.orgExposureScore}/100 ${trendArrow(previous?.orgExposureScore ?? null, latest.orgExposureScore)}
- **Expositions ouvertes :** ${latest.exposedCount} ${trendArrow(previous?.exposedCount ?? null, latest.exposedCount)}
- **En attente de validation RSSI (NEW) :** ${latest.newCount}
- **Formation de remédiation assignée :** ${latest.trainingCount}
- **Remédiées :** ${latest.remediatedCount}
- **Écartées (faux positifs) :** ${latest.dismissedCount}
- **Taux de remédiation :** ${remediationRate !== null ? remediationRate + " %" : "—"}`
    : "_Aucun snapshot disponible : la veille n'a pas encore produit de mesure._"
}

## Tendance (30 derniers snapshots)

| Jour | Ouvertes | Remédiées | Score |
|---|---|---|---|
${history || "| — | — | — | — |"}

## Mesures de sécurité en place

1. **Détection** automatisée du matching domaine ↔ fuites publiques (quotidienne).
2. **Validation humaine RSSI** obligatoire avant toute action (anti faux positif,
   anti notification automatique).
3. **Remédiation par la formation** : assignation d'un module ciblé au salarié
   concerné après validation.
4. **Traçabilité** : chaque détection, validation et assignation est journalisée
   (journal d'audit, accountability RGPD art. 5.2).
5. **Minimisation** : seuls les comptes sur les domaines déclarés sont analysés ;
   toute donnée de tiers est exclue par construction.

## Cadre juridique

- **NIS2 (directive UE 2022/2555) art. 21** — gestion des risques de cybersécurité :
  cette veille constitue une mesure de surveillance et de traitement des menaces.
- **RGPD art. 32** — sécurité du traitement : démarche proportionnée de réduction
  du risque sur les comptes des personnes concernées.
- **RGPD art. 28** — sous-traitance : encadrée par le DPA signé (cf. en-tête).

_Document généré automatiquement. Données agrégées, sans information individuelle._
`;

  return { ok: true, generatedAt, markdown: md };
}
