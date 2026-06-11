// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Seed PROD-SAFE du catalog partagé (saisons + épisodes + boutique + badges +
// tenant Communauté). Idempotent (upserts par slug).
//
// POURQUOI CE SCRIPT :
//   `prisma db seed` (prisma/seed.ts) crée AUSSI des fake users de démo : on
//   ne peut donc pas le lancer en production. Du coup, l'ancien
//   docker-entrypoint.sh SKIPPAIT tout seed quand DEMO_MODE != true. Résultat :
//   les saisons et badges ajoutés au code APRÈS le 1er déploiement
//   n'arrivaient JAMAIS en BDD de prod (-> modules en 404, badges manquants —
//   bug juin 2026).
//
//   Ce script n'importe QUE le catalog universel (aucun fake user) : il est
//   donc sûr à lancer à chaque déploiement, en prod comme en démo.
//
// Lancé par docker-entrypoint.sh. Relançable à la main et via le bouton
// /superadmin/catalog.

import { PrismaClient } from "@prisma/client";
import { seedCatalog } from "../lib/catalog-seeder";
import { reEvaluateAllUsers } from "../lib/achievements/evaluate";

async function main() {
  const prisma = new PrismaClient();
  try {
    const r = await seedCatalog(prisma);
    console.log(
      `[seed-catalog] catalog OK — ${r.saisons} saisons, ${r.episodes} episodes, ` +
        `${r.achievements} badges, ${r.shopItems} items boutique ` +
        `(source: ${r.catalogSource}, ${r.durationMs}ms)`,
    );

    // Réévalue les badges de tous les users actifs : les badges fraîchement
    // seedés (dont les rows Achievement manquaient) sont ainsi débloqués
    // rétroactivement pour ceux qui les ont déjà mérités.
    const re = await reEvaluateAllUsers();
    console.log(
      `[seed-catalog] reevaluation badges — ${re.evaluated} users, ` +
        `${re.totalNewUnlocks} badge(s) debloque(s) retroactivement`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[seed-catalog] ECHEC:", e);
  process.exit(1);
});
