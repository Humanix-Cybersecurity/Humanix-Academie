#!/usr/bin/env tsx
// SPDX-License-Identifier: AGPL-3.0-or-later
// Purge des AuditLog antérieurs à 13 mois (recommandation CNIL pour les
// logs sécurité). À planifier en cron quotidien sur l'opérateur.
//
// Usage :
//   npx tsx scripts/purge-old-audit-logs.ts             # purge defaut 13 mois
//   npx tsx scripts/purge-old-audit-logs.ts --days=400  # purge custom
//   npx tsx scripts/purge-old-audit-logs.ts --dry-run   # simulation
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  let days = 400; // ≈ 13 mois
  let dryRun = false;
  for (const a of args) {
    if (a === "--dry-run") dryRun = true;
    else if (a.startsWith("--days=")) days = parseInt(a.slice(7), 10) || days;
  }

  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
  console.log(`Cutoff : avant ${cutoff.toISOString()}`);

  const count = await prisma.auditLog.count({
    where: { createdAt: { lt: cutoff } },
  });
  console.log(`Entrées concernées : ${count}`);

  if (dryRun) {
    console.log("Dry-run : aucune suppression effectuée.");
    return;
  }

  if (count === 0) {
    console.log("Rien à purger.");
    return;
  }

  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  console.log(`Supprimées : ${result.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
