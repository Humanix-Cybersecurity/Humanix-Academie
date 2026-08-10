// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Resolution des cibles pour les campagnes a diffusion manuelle (#744).
//
// Meme regle que les autres canaux : membres ACTIFS du tenant, roles
// LEARNER/MANAGER (on ne teste pas les admins qui montent l'exercice),
// restreints aux groupes selectionnes le cas echeant.
//
// Extrait ici plutot que duplique dans les actions smishing et vishing :
// une divergence de perimetre entre canaux rendrait les indicateurs
// multi-canaux incomparables.

import { db } from "@/lib/db";

export type ResolvedTargets = {
  targets: { id: string }[];
  targetingMode: "groups" | "all";
  targetingDetail: string | null;
};

export async function resolveManualTargets(
  tenantId: string,
  groupSlugs: string[],
): Promise<ResolvedTargets> {
  const base = {
    tenantId,
    isActive: true,
    role: { in: ["LEARNER" as const, "MANAGER" as const] },
  };

  if (groupSlugs.length > 0) {
    const targets = await db.user.findMany({
      where: {
        ...base,
        groups: {
          some: {
            group: { slug: { in: groupSlugs }, isActive: true, tenantId },
          },
        },
      },
      select: { id: true },
    });
    return {
      targets,
      targetingMode: "groups",
      targetingDetail: `groups:${groupSlugs.join(",")}`,
    };
  }

  const targets = await db.user.findMany({ where: base, select: { id: true } });
  return { targets, targetingMode: "all", targetingDetail: null };
}
