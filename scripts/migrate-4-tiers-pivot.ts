// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Migration de donnees one-shot (idempotente) : pivot 4 paliers mai 2026.
//
// Faisait quoi avant :
//   - 5 paliers cloud : decouverte / solo / essentielle / pro / premium
//   - Trop complique pour les utilisateurs ("retours sales : trop de tarifs
//     differents, les gens s'y perdent")
//
// Fait quoi maintenant :
//   - 3 paliers cloud : starter / pro / enterprise (+ Community Edition self-host)
//   - Mapping : decouverte/solo -> starter, essentielle -> pro, premium -> enterprise
//
// Ce script bascule les Tenant.plan en BDD vers les nouveaux noms.
// Les recommendations d'audit-flash (AuditFlashSubmission.recommendedPlan)
// sont aussi rebasculees pour rester coherentes avec l'UI actuelle.
//
// Idempotent : tourner plusieurs fois ne change rien apres le 1er passage
// (les UPDATEs ne matchent plus aucune row).
//
// Lance via le docker-entrypoint a chaque boot (cout = 4 UPDATE no-op).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLAN_MIGRATIONS: { from: string; to: string }[] = [
  { from: "decouverte", to: "starter" },
  { from: "solo", to: "starter" },
  { from: "essentielle", to: "pro" },
  { from: "premium", to: "enterprise" },
];

async function main() {
  let totalTenants = 0;
  for (const { from, to } of PLAN_MIGRATIONS) {
    const result = await prisma.tenant.updateMany({
      where: { plan: from },
      data: { plan: to },
    });
    if (result.count > 0) {
      console.log(
        `[migrate-4-tiers] ${result.count} tenant(s) plan=${from} -> ${to}`,
      );
      totalTenants += result.count;
    }
  }

  // Audit-flash : meme mapping pour les recommendations stockees.
  // La table peut ne pas exister sur des deploiements tres anciens, on encadre.
  let totalAudits = 0;
  try {
    for (const { from, to } of PLAN_MIGRATIONS) {
      const result = await prisma.auditFlashSubmission.updateMany({
        where: { recommendedPlan: from },
        data: { recommendedPlan: to },
      });
      if (result.count > 0) {
        console.log(
          `[migrate-4-tiers] ${result.count} auditFlash recommendedPlan=${from} -> ${to}`,
        );
        totalAudits += result.count;
      }
    }
  } catch (e) {
    // Table absente ou autre - non bloquant
    console.log(
      "[migrate-4-tiers] auditFlashSubmission update skipped (table absent ou erreur)",
    );
  }

  if (totalTenants === 0 && totalAudits === 0) {
    console.log("[migrate-4-tiers] no-op (aucune row legacy a migrer)");
  } else {
    console.log(
      `[migrate-4-tiers] migration terminee : ${totalTenants} tenant(s) + ${totalAudits} audit(s)`,
    );
  }
}

main()
  .catch((e) => {
    console.error("[migrate-4-tiers] echec :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
