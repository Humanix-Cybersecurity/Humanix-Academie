// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Veille B2B - DÉTECTION du matching domaine tenant ↔ observatoire des fuites.
//
// GARANTIES ANTI-DÉRIVE (cf. b2b-flags.ts + roadmap Go/No-Go) :
//   - Ne s'exécute QUE si isB2bMonitoringActive(tenant) (triple garde).
//   - DÉTECTE seulement (crée des EmployeeExposure status=NEW). N'envoie
//     AUCUNE notification, n'assigne AUCUNE formation. Tout passe par une
//     validation RSSI humaine ensuite (b2b-assign.ts).
//   - ANTI-TIERS : ne traite QUE les salariés dont l'email est sur un des
//     domaines DÉCLARÉS du tenant. Tout autre email = donnée de tiers,
//     jamais créée.
//   - Idempotent : @@unique([userId, breachId]) -> pas de doublon au re-scan.

import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { isB2bMonitoringActive } from "@/lib/exposure/b2b-flags";

export type ScanResult = {
  tenantId: string;
  active: boolean;
  matchedBreaches: number;
  newExposures: number;
};

/** Trouve les fuites de l'observatoire liées à un domaine/organisation. */
async function breachesForDomain(domain: string): Promise<string[]> {
  const orgGuess = domain.split(".")[0];
  const rows = await db.dataBreach.findMany({
    where: {
      isPublished: true,
      OR: [
        { organization: { contains: orgGuess, mode: "insensitive" } },
        { title: { contains: orgGuess, mode: "insensitive" } },
        { organization: { contains: domain, mode: "insensitive" } },
        { title: { contains: domain, mode: "insensitive" } },
      ],
    },
    select: { id: true },
    take: 50,
  });
  return rows.map((r) => r.id);
}

/**
 * Scanne un tenant : détecte les salariés potentiellement exposés via les
 * fuites touchant leurs domaines déclarés. Crée des EmployeeExposure NEW.
 * No-op si la veille n'est pas active (triple garde).
 */
export async function scanTenantDomainExposure(
  tenantId: string,
): Promise<ScanResult> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      exposureMonitoringEnabled: true,
      exposureMonitoringDpaSignedAt: true,
      exposureDomains: true,
    },
  });

  if (!tenant || !isB2bMonitoringActive(tenant)) {
    return { tenantId, active: false, matchedBreaches: 0, newExposures: 0 };
  }

  let matchedBreaches = 0;
  let newExposures = 0;

  for (const domain of tenant.exposureDomains) {
    const dom = domain.trim().toLowerCase();
    if (!dom) continue;

    const breachIds = await breachesForDomain(dom);
    if (breachIds.length === 0) continue;
    matchedBreaches += breachIds.length;

    // ANTI-TIERS : uniquement les salariés actifs de CE tenant sur CE domaine.
    const users = await db.user.findMany({
      where: {
        tenantId,
        isActive: true,
        email: { endsWith: `@${dom}`, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (users.length === 0) continue;

    // Création idempotente des expositions NEW (jamais de notif ici).
    for (const breachId of breachIds) {
      for (const u of users) {
        try {
          await db.employeeExposure.create({
            data: {
              tenantId,
              userId: u.id,
              breachId,
              matchedDomain: dom,
              status: "NEW",
            },
          });
          newExposures++;
        } catch {
          // @@unique([userId, breachId]) -> deja detecte, on ignore.
        }
      }
    }
  }

  if (newExposures > 0) {
    void auditLog({
      action: "EXPOSURE_DETECTED",
      outcome: "SUCCESS",
      tenantId,
      target: { type: "employee_exposure", label: `${newExposures} detection(s)` },
      message: `Veille domaine : ${newExposures} exposition(s) NEW (validation RSSI requise avant toute notification).`,
      metadata: { matchedBreaches, newExposures },
    });
  }

  return { tenantId, active: true, matchedBreaches, newExposures };
}
