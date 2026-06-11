// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";
//
// Server actions de la page /superadmin/catalog.
//
// Permet aux operateurs Humanix Cybersecurity (role SUPERADMIN, deja step-up
// WebAuthn par le layout parent) de declencher manuellement le seed du catalog
// partage (saisons + episodes + boutique + badges + tenant Communaute) sans
// passer par la ligne de commande Docker.
//
// USAGE TYPIQUE :
//   1. Un developpeur ajoute des saisons / badges / items dans le code
//      (prisma/catalog-saisons.ts, lib/shop.ts, lib/achievements/catalog.ts)
//   2. La PR est mergee et deployee en prod
//   3. Le SUPERADMIN va sur /superadmin/catalog
//   4. Clic sur "Re-importer le catalog" -> seedCatalog() tourne, les nouvelles
//      entites apparaissent en BDD via upsert (idempotent, pas de doublon)
//
// IDEMPOTENCE :
//   Tous les upserts sont par slug. Re-jouer est SAFE. Les anciens slugs en
//   BDD non presents dans le code (ex. badge retire) NE SONT PAS SUPPRIMES
//   pour ne pas casser les UserAchievement / UserInventory existants.
//
// SECURITE :
//   - Le layout /superadmin/layout.tsx verifie deja role=SUPERADMIN + step-up
//     WebAuthn frais (< 30 min). Double-check ici en defense en profondeur.
//   - L'operation est audit-loggee avec AuditAction.CATALOG_RESEEDED.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import { seedCatalog, type SeedCatalogResult } from "@/lib/catalog-seeder";
import { reEvaluateAllUsers } from "@/lib/achievements/evaluate";
import { AuditOutcome, AuditSeverity } from "@prisma/client";

async function requireSuperadminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    throw new Error("UNAUTHORIZED: SUPERADMIN required");
  }
  return session;
}

export type ReseedCatalogResponse =
  | {
      ok: true;
      result: SeedCatalogResult;
      /** Badges debloques retroactivement apres re-import (badges nouvellement
       *  seedes que des users avaient deja merites). */
      reevaluation: { evaluated: number; newBadges: number };
    }
  | { ok: false; error: string };

/**
 * Re-execute le seed du catalog partage. Idempotent.
 *
 * Retourne les counts (saisons, episodes, badges, items) + duree pour
 * affichage UI. Audit log obligatoire.
 */
export async function reseedCatalogAction(): Promise<ReseedCatalogResponse> {
  const session = await requireSuperadminSession();
  const actorEmail = session.user.email ?? "unknown";
  const actorUserId = session.user.id as string;

  try {
    const result = await seedCatalog(db);

    // Reevalue les badges de tous les users : les badges fraichement seedes
    // (dont la row Achievement manquait) sont debloques retroactivement pour
    // ceux qui les avaient deja merites. C'est ce qui repare les "badges
    // manquants" cote utilisateur en un seul clic.
    const re = await reEvaluateAllUsers();

    await auditLog({
      action: AuditActions.CATALOG_RESEEDED,
      outcome: AuditOutcome.SUCCESS,
      severity: AuditSeverity.NOTICE,
      actor: {
        userId: actorUserId,
        email: actorEmail,
        role: "SUPERADMIN",
      },
      target: {
        type: "catalog",
        label: `${result.saisons} saisons / ${result.episodes} episodes / ${result.achievements} badges / ${result.shopItems} items`,
      },
      message: `Re-seed catalog effectue (source: ${result.catalogSource}, ${result.durationMs} ms) — ${re.totalNewUnlocks} badge(s) retroactif(s)`,
      metadata: {
        catalogSource: result.catalogSource,
        saisons: result.saisons,
        episodes: result.episodes,
        achievements: result.achievements,
        shopItems: result.shopItems,
        durationMs: result.durationMs,
        reevaluatedUsers: re.evaluated,
        newBadges: re.totalNewUnlocks,
      },
    });

    return {
      ok: true,
      result,
      reevaluation: { evaluated: re.evaluated, newBadges: re.totalNewUnlocks },
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "unknown_error";

    // Log meme l'echec, pour avoir une trace en cas de probleme catalog.
    await auditLog({
      action: AuditActions.CATALOG_RESEEDED,
      outcome: AuditOutcome.FAILURE,
      severity: AuditSeverity.WARNING,
      actor: {
        userId: actorUserId,
        email: actorEmail,
        role: "SUPERADMIN",
      },
      target: { type: "catalog" },
      message: `Re-seed catalog ECHEC: ${errorMessage}`,
      metadata: { error: errorMessage },
    });

    return { ok: false, error: errorMessage };
  }
}
