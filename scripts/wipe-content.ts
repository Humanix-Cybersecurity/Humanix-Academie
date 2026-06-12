// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Wipe des tables de contenu (Saison, Episode, LibraryArticle,
// MarketplaceModule, WeeklyAnecdote) pour permettre un re-seed propre
// - typiquement quand on bascule une instance existante en DEMO_MODE
// alors qu'elle avait deja ete seedee avec le catalogue commercial.
//
// CE QUI EST CONSERVE :
//   - User, Tenant, Group, UserGroup (utilisateurs intacts)
//   - AnecdoteSubscription (abonnements newsletter)
//   - Toutes les tables admin (ApiKey, PhishingCampaign, etc.)
//
// CE QUI EST PURGE (cascade Prisma) :
//   - Saison + Episode (cascade)
//   - TenantSaisonConfig (cascade depuis Saison)
//   - Progress (cascade depuis Episode) -- attention : tu perds l'historique
//     d'apprentissage des users. Acceptable pour une demo, dangereux en prod.
//   - LibraryArticle
//   - MarketplaceModule + MarketplaceInstallation (cascade)
//   - WeeklyAnecdote
//
// USAGE :
//   tsx scripts/wipe-content.ts            # dry-run, montre les counts
//   tsx scripts/wipe-content.ts --apply    # execute la suppression
//   tsx scripts/wipe-content.ts --apply --force  # bypass garde-fou prod
//
// SECURITES :
//   1. Refuse si NODE_ENV=production ET DEMO_MODE != true, sauf --force.
//      Empeche de wipe accidentellement une prod commerciale.
//   2. Dry-run par defaut, --apply requis.
//   3. Affiche un compte rendu avant et apres.
//
// APRES LE WIPE : relancer `npm run db:seed` (avec ou sans DEMO_MODE
// selon ce que tu veux re-seeder).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function counts() {
  return {
    saisons: await prisma.saison.count(),
    episodes: await prisma.episode.count(),
    tenantSaisonConfigs: await prisma.tenantSaisonConfig.count(),
    progress: await prisma.progress.count(),
    articles: await prisma.libraryArticle.count(),
    modules: await prisma.marketplaceModule.count(),
    installations: await prisma.marketplaceInstallation.count(),
    anecdotes: await prisma.weeklyAnecdote.count(),
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const force = process.argv.includes("--force");

  const isProd = process.env.NODE_ENV === "production";
  const isDemo = process.env.DEMO_MODE === "true";

  console.log("=== wipe-content.ts ===");
  console.log(`NODE_ENV=${process.env.NODE_ENV ?? "<unset>"}`);
  console.log(`DEMO_MODE=${process.env.DEMO_MODE ?? "<unset>"}`);
  console.log(`mode    : ${apply ? "APPLY (suppression réelle)" : "DRY-RUN"}`);
  console.log("");

  if (isProd && !isDemo && !force) {
    console.error(
      "❌ REFUS : NODE_ENV=production sans DEMO_MODE=true.\n" +
        "   Si tu veux quand meme purger : ajoute --force (a tes risques).",
    );
    process.exit(2);
  }

  const before = await counts();
  console.log("📊 État actuel :");
  for (const [k, v] of Object.entries(before)) {
    console.log(`   ${k.padEnd(22)} ${v}`);
  }
  const totalRows = Object.values(before).reduce((a, b) => a + b, 0);
  console.log(`   ${"─".repeat(30)}`);
  console.log(`   ${"TOTAL".padEnd(22)} ${totalRows}`);
  console.log("");

  if (totalRows === 0) {
    console.log("✓ Rien à wipe - toutes les tables sont déjà vides.");
    return;
  }

  if (!apply) {
    console.log("ℹ️  DRY-RUN. Ajoute --apply pour exécuter la suppression.");
    console.log("");
    console.log("   Exemple : tsx scripts/wipe-content.ts --apply");
    return;
  }

  console.log("🗑️  Suppression en cours...");

  // Ordre de suppression : enfants -> parents pour eviter les contraintes FK
  // meme si la cascade Prisma le ferait automatiquement, on est explicite
  // pour avoir un comptage clair des operations.
  const r1 = await prisma.progress.deleteMany();
  console.log(`   Progress              : ${r1.count} supprimés`);

  const r2 = await prisma.tenantSaisonConfig.deleteMany();
  console.log(`   TenantSaisonConfig    : ${r2.count} supprimés`);

  const r3 = await prisma.episode.deleteMany();
  console.log(`   Episode               : ${r3.count} supprimés`);

  const r4 = await prisma.saison.deleteMany();
  console.log(`   Saison                : ${r4.count} supprimés`);

  const r5 = await prisma.libraryArticle.deleteMany();
  console.log(`   LibraryArticle        : ${r5.count} supprimés`);

  const r6 = await prisma.marketplaceInstallation.deleteMany();
  console.log(`   MarketplaceInstall.   : ${r6.count} supprimés`);

  const r7 = await prisma.marketplaceModule.deleteMany();
  console.log(`   MarketplaceModule     : ${r7.count} supprimés`);

  const r8 = await prisma.weeklyAnecdote.deleteMany();
  console.log(`   WeeklyAnecdote        : ${r8.count} supprimés`);

  console.log("");
  const after = await counts();
  console.log("📊 État final :");
  for (const [k, v] of Object.entries(after)) {
    console.log(`   ${k.padEnd(22)} ${v}`);
  }

  console.log("");
  console.log("✅ Wipe terminé. Relance `npm run db:seed` pour re-peupler.");
  if (isDemo) {
    console.log("   (DEMO_MODE=true → seed démo + 5 articles + 6 anecdotes 2024)");
  }
}

main()
  .catch((err) => {
    console.error("❌ Erreur :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
