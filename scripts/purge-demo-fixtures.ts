// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Purge des fixtures de demo (tenant demo-pme + 12 fake users + cascade)
// d'une BDD de prod commerciale.
//
// CONTEXTE : avant le PR #210, `npm run db:seed` peuplait systematiquement
// le tenant "demo-pme" + les comptes sophie@/yanis@/... meme en prod. Ce
// script permet de nettoyer une BDD historique sans toucher aux vrais
// tenants clients.
//
// USAGE :
//   tsx scripts/purge-demo-fixtures.ts            # dry-run, affiche ce qui serait supprime
//   tsx scripts/purge-demo-fixtures.ts --apply    # execute la suppression
//
// SECURITES :
//   1. Refuse si DEMO_MODE=true (on ne purge pas une instance de demo)
//   2. Dry-run par defaut, --apply requis pour executer
//   3. Refuse si contact@humanix-cybersecurity.fr est rattache au tenant
//      demo-pme (compte SUPERADMIN, probablement le vrai admin de la
//      plateforme : il faut le deplacer manuellement avant)
//   4. Affiche un compte rendu detaille avant + apres
//
// CASCADE Prisma (cf. schema.prisma) : supprimer le tenant demo-pme cascade
// sur User, Group, UserGroup, Progress, TenantSaisonConfig, Event,
// TeamChallenge, ApiKey, PhishingCampaign, NotificationLog,
// MarketplaceInstallation. Et les MarketplaceModule dont les fake users
// sont auteurs disparaissent via cascade authorId -> User.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_TENANT_SLUG = "demo-pme";
const SUPERADMIN_EMAIL = "contact@humanix-cybersecurity.fr";

async function main() {
  const apply = process.argv.includes("--apply");
  const force = process.argv.includes("--force"); // bypass DEMO_MODE check

  console.log(
    `🧹 Purge fixtures demo (mode: ${apply ? "APPLY (destructif)" : "DRY-RUN"})`,
  );
  console.log("");

  // === Garde 1 : refuse si DEMO_MODE=true ===
  if (process.env.DEMO_MODE === "true" && !force) {
    console.error(
      "❌ DEMO_MODE=true detecte. Ce script est concu pour nettoyer une",
    );
    console.error(
      "   instance de PROD qui contient encore des fixtures demo historiques.",
    );
    console.error(
      "   Si tu es vraiment sur, ajoute --force (mais reflechis bien).",
    );
    process.exit(1);
  }

  // === Inventaire : qu'est-ce qu'on trouve ? ===
  const tenant = await prisma.tenant.findUnique({
    where: { slug: DEMO_TENANT_SLUG },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    console.log(`✓ Aucun tenant "${DEMO_TENANT_SLUG}" trouve. Rien a faire.`);
    return;
  }

  // Counts ciblees (toutes ces tables ont un tenantId, cascade onDelete)
  const tenantId = tenant.id;
  const [
    nbUsers,
    nbGroups,
    nbProgress,
    nbEvents,
    nbChallenges,
    nbApiKeys,
    nbCampaigns,
    nbNotifications,
    nbInstallations,
    nbSaisonConfigs,
    nbTenantSaisons,
  ] = await Promise.all([
    prisma.user.count({ where: { tenantId } }),
    prisma.group.count({ where: { tenantId } }),
    prisma.progress.count({ where: { tenantId } }),
    prisma.event.count({ where: { tenantId } }),
    prisma.teamChallenge.count({ where: { tenantId } }),
    prisma.apiKey.count({ where: { tenantId } }),
    prisma.phishingCampaign.count({ where: { tenantId } }),
    prisma.notificationLog.count({ where: { tenantId } }),
    prisma.marketplaceInstallation.count({ where: { tenantId } }),
    prisma.tenantSaisonConfig.count({ where: { tenantId } }),
    prisma.saison.count({ where: { tenantId } }),
  ]);

  console.log(`Tenant trouve : ${tenant.slug} (id=${tenant.id})`);
  console.log(`  - users               : ${nbUsers}`);
  console.log(`  - groups              : ${nbGroups}`);
  console.log(`  - progress            : ${nbProgress}`);
  console.log(`  - events              : ${nbEvents}`);
  console.log(`  - challenges          : ${nbChallenges}`);
  console.log(`  - apiKeys             : ${nbApiKeys}`);
  console.log(`  - phishingCampaigns   : ${nbCampaigns}`);
  console.log(`  - notificationLogs    : ${nbNotifications}`);
  console.log(`  - marketplaceInstalls : ${nbInstallations}`);
  console.log(`  - saisonConfigs       : ${nbSaisonConfigs}`);
  console.log(`  - saisons (cascade)   : ${nbTenantSaisons}`);

  // Marketplace modules dont les auteurs sont dans le tenant
  const mpModules = await prisma.marketplaceModule.findMany({
    where: { author: { tenantId: tenant.id } },
    select: { slug: true, title: true, isOfficial: true },
  });
  console.log(
    `  - marketplace modules (cascade via authorId) : ${mpModules.length}`,
  );
  for (const m of mpModules) {
    console.log(
      `      • ${m.slug} ${m.isOfficial ? "[OFFICIEL]" : "[community]"} : ${m.title}`,
    );
  }
  console.log("");

  // === Garde 2 : SUPERADMIN dans le tenant ? ===
  const superadmin = await prisma.user.findFirst({
    where: {
      email: SUPERADMIN_EMAIL,
      tenantId: tenant.id,
    },
    select: { id: true, email: true, role: true },
  });

  if (superadmin) {
    console.error(
      `❌ ${SUPERADMIN_EMAIL} (role=${superadmin.role}) est rattache au tenant`,
    );
    console.error(
      `   demo-pme. Le supprimer en cascade est probablement une erreur :`,
    );
    console.error(
      `   c'est le compte SUPERADMIN de la plateforme HumaniX.`,
    );
    console.error("");
    console.error("   Action requise AVANT de relancer ce script :");
    console.error(
      `     1. Cree un tenant "humanix" (ou recupere l'id de ton tenant proprietaire)`,
    );
    console.error(
      `     2. UPDATE "User" SET "tenantId" = '<id-tenant-humanix>' WHERE email = '${SUPERADMIN_EMAIL}';`,
    );
    console.error("     3. Relance ce script");
    process.exit(2);
  }

  // === Liste des users avant purge (pour transparence) ===
  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    select: { email: true, role: true, isActive: true },
    orderBy: { email: "asc" },
  });
  console.log(`Users du tenant (${users.length}) qui seront supprimes :`);
  for (const u of users) {
    console.log(`  - ${u.email} [${u.role}${u.isActive ? "" : " inactive"}]`);
  }
  console.log("");

  // === DRY-RUN ===
  if (!apply) {
    console.log("🔎 DRY-RUN : aucune modification effectuee.");
    console.log(
      "   Pour executer reellement la suppression : --apply",
    );
    return;
  }

  // === APPLY ===
  console.log("⚠️  Suppression en cours...");
  const deleted = await prisma.tenant.delete({
    where: { id: tenant.id },
    select: { id: true, slug: true },
  });
  console.log(`✅ Tenant ${deleted.slug} supprime (cascade).`);
  console.log("");

  // Verification post-purge
  const remainingTenant = await prisma.tenant.findUnique({
    where: { slug: DEMO_TENANT_SLUG },
  });
  const remainingDemoUsers = await prisma.user.count({
    where: { email: { endsWith: "@demo-pme.fr" } },
  });
  console.log(`Verification : tenant ${DEMO_TENANT_SLUG} = ${remainingTenant ? "ENCORE PRESENT" : "supprime ✓"}`);
  console.log(
    `Verification : users @demo-pme.fr restants = ${remainingDemoUsers} ${remainingDemoUsers === 0 ? "✓" : "⚠️"}`,
  );
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
