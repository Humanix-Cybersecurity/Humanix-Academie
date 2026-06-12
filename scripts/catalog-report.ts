// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Rapport READ-ONLY de la source du catalogue. Execute en tsx (donc lit le
// fichier .ts sur disque et SUIT le symlink prisma/catalog-saisons.ts ->
// content-pro). Aucun acces BDD.
//
// POURQUOI : le bundle serveur Next ne resout pas fiablement ce symlink, donc
// loadCatalogSaisons() appele DANS le runtime Next retombe a tort sur "demo"
// meme quand content-pro est present. tsx, lui, voit le commercial (exactement
// comme le boot-seed et `npm run db:seed`). /superadmin/catalog delegue donc
// son diagnostic a ce script (cf. lib/catalog-runner.ts).
//
// Sortie : une unique ligne `__CATALOG_REPORT__{json}` sur stdout.

import {
  loadCatalogSaisons,
  isCommercialCatalogAvailable,
} from "../prisma/seed-data-loader";
import { SHOP_CATALOG } from "../lib/shop";
import { ACHIEVEMENTS_CATALOG } from "../lib/achievements/catalog";

const { saisons, source } = loadCatalogSaisons();

const report = {
  source,
  demoMode: process.env.DEMO_MODE === "true",
  commercialAvailable: isCommercialCatalogAvailable(),
  saisons: saisons.length,
  episodes: saisons.reduce((n, s) => n + s.episodes.length, 0),
  badges: ACHIEVEMENTS_CATALOG.length,
  items: SHOP_CATALOG.length,
};

console.log("__CATALOG_REPORT__" + JSON.stringify(report));
