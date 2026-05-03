#!/usr/bin/env tsx
/**
 * Nettoyage des items pourris dans l'observatoire des fuites.
 *
 * À exécuter après changement de stratégie de scraping :
 *   - Supprime tous les items des sources non-actives (FUITESINFOS retiré)
 *   - Supprime les items dont le titre commence par des fragments de footer
 *     (ex: "par ici", "Pour signaler", etc.) qui sont du contenu non-pertinent
 *     scrapé par erreur
 *
 * Usage : docker compose exec app npm run breaches:cleanup
 */

import { db } from "../lib/db";
import { ACTIVE_SOURCES } from "../lib/breaches/types";

async function main() {
  console.log("🧹 Nettoyage de l'observatoire des fuites…\n");

  // 1. Suppression des sources non-actives (FUITESINFOS et toute future
  //    désactivation).
  const inactive = await db.dataBreach.deleteMany({
    where: {
      source: { notIn: ACTIVE_SOURCES as any },
    },
  });
  console.log(`  ✓ Sources inactives supprimées : ${inactive.count} items`);

  // 2. Patterns de pollution connus (fragments de footers/headers ramassés
  //    par erreur par les fallbacks HTML).
  const POLLUTION_PATTERNS = [
    "par ici",
    "Pour signaler",
    "imirhil.fr",
    "Clef GPG",
    "C'est qui qui a fuité",
    "Pour savoir pourquoi",
    "fuites signalées",
  ];

  let pollutionRemoved = 0;
  for (const pattern of POLLUTION_PATTERNS) {
    const result = await db.dataBreach.deleteMany({
      where: {
        OR: [
          { title: { contains: pattern, mode: "insensitive" } },
          { summary: { contains: pattern, mode: "insensitive" } },
        ],
      },
    });
    if (result.count > 0) {
      console.log(`  ✓ Pattern « ${pattern} » : ${result.count} items supprimés`);
      pollutionRemoved += result.count;
    }
  }
  console.log(`  Total items polluants : ${pollutionRemoved}`);

  // 3. Stats finales
  const remaining = await db.dataBreach.groupBy({
    by: ["source"],
    _count: { _all: true },
  });
  console.log("\n📊 État final :");
  for (const r of remaining) {
    console.log(`  ${r.source} : ${r._count._all} items`);
  }

  await db.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
