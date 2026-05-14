// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Seed démo : produit un panel des 4 statuts d'evidence ISO 27001:2022
// pour la démo CISO Assistant. Données réalistes pour une PME en cours
// d'adoption Humanix (4 mois après onboarding).
//
// Usage : docker exec humanix-app npx tsx scripts/seed-grc-demo.ts
//
// État final attendu après run + sync :
//   - A.5.1, A.5.24, A.6.6 : compliant (contrôles documentaires, toujours)
//   - A.7.7  : compliant     (module "bureau-propre" déployé)
//   - A.6.8  : partial       (phishingReportRate = 0.3, entre 0.2 et 0.5)
//   - A.6.3  : non_compliant (tenant_score < 0.4, faible engagement)
//   - A.8.7  : not_assessed  (pas de seuil défini sur ce contrôle)
//
// Le script est idempotent : relancer plusieurs fois ne dégrade rien.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Le sync admin tourne sur le tenant de l'utilisateur logué. En local
  // démo, c'est "Humanix Communauté" (l'environnement DEMO_MODE) plutôt
  // que "PME Démo" qui est un tenant fixture historique. On cible
  // explicitement par nom, fallback sur le premier.
  const tenant =
    (await db.tenant.findFirst({
      where: { name: "Humanix Communauté" },
      select: { id: true, name: true },
    })) ??
    (await db.tenant.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }));
  if (!tenant) {
    throw new Error("Aucun tenant en base. Lance d'abord le seed initial.");
  }
  console.log(`Tenant ciblé : ${tenant.name} (${tenant.id})`);

  // === 1. Créer 9 utilisateurs LEARNER supplémentaires (passe à ~10) ===
  const demoUsers = [
    { email: "alice.martin.communaute@humanix-demo.fr", name: "Alice Martin" },
    { email: "bob.dupont.communaute@humanix-demo.fr", name: "Bob Dupont" },
    { email: "claire.bernard.communaute@humanix-demo.fr", name: "Claire Bernard" },
    { email: "david.petit.communaute@humanix-demo.fr", name: "David Petit" },
    { email: "emma.rousseau.communaute@humanix-demo.fr", name: "Emma Rousseau" },
    { email: "francois.moreau.communaute@humanix-demo.fr", name: "François Moreau" },
    { email: "gabrielle.simon.communaute@humanix-demo.fr", name: "Gabrielle Simon" },
    { email: "hugo.laurent.communaute@humanix-demo.fr", name: "Hugo Laurent" },
    { email: "isabelle.michel.communaute@humanix-demo.fr", name: "Isabelle Michel" },
  ];
  let usersCreated = 0;
  const userIds: string[] = [];
  for (const u of demoUsers) {
    const existing = await db.user.findFirst({
      where: { email: u.email, tenantId: tenant.id },
      select: { id: true },
    });
    if (existing) {
      userIds.push(existing.id);
      continue;
    }
    const created = await db.user.create({
      data: {
        email: u.email,
        name: u.name,
        tenantId: tenant.id,
        role: "LEARNER",
        isActive: true,
        emailVerified: new Date(),
      },
      select: { id: true },
    });
    userIds.push(created.id);
    usersCreated += 1;
  }
  console.log(`Utilisateurs : ${usersCreated} créés (${userIds.length} total démo).`);

  // === 2. Créer 3 events phishing.report pour atteindre rate 0.3 ===
  // (3 reports sur 10 users = 0.3, entre partial 0.2 et compliant 0.5)
  const existingReports = await db.event.count({
    where: { tenantId: tenant.id, type: "phishing.report" },
  });
  const reportsToCreate = Math.max(0, 3 - existingReports);
  for (let i = 0; i < reportsToCreate; i++) {
    await db.event.create({
      data: {
        tenantId: tenant.id,
        userId: userIds[i],
        type: "phishing.report",
        payload: {
          source: "seed-grc-demo",
          campaign: "demo-q2-2026",
          reported_at: new Date().toISOString(),
        },
      },
    });
  }
  console.log(
    `Events phishing.report : ${reportsToCreate} créés (${existingReports + reportsToCreate} total).`,
  );

  // === 3. Marketplace : module "bureau-propre" déployé pour A.7.7 ===
  // a) Trouver/créer le MarketplaceModule "bureau-propre"
  const moduleAuthor =
    (await db.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true },
    })) ??
    (await db.user.findFirst({ select: { id: true } }));
  if (!moduleAuthor) throw new Error("Pas d'auteur disponible");

  const moduleSlug = "bureau-propre";
  let mpModule = await db.marketplaceModule.findUnique({
    where: { slug: moduleSlug },
    select: { id: true },
  });
  if (!mpModule) {
    mpModule = await db.marketplaceModule.create({
      data: {
        slug: moduleSlug,
        title: "Bureau propre & écran verrouillé",
        description:
          "Sensibilisation 5 minutes aux bons réflexes : ranger les documents sensibles, verrouiller son écran (Win+L / Ctrl+Cmd+Q), éviter les post-it visibles. Conforme ISO 27001 A.7.7.",
        emoji: "🧹",
        category: "donnees",
        difficulty: "easy",
        language: "fr",
        authorId: moduleAuthor.id,
        authorOrgName: "Humanix Académie",
        isOfficial: true,
        version: "1.0.0",
        contentHash:
          "0000000000000000000000000000000000000000000000000000000000000000", // seed factice
        payload: {
          slug: moduleSlug,
          version: "1.0.0",
          chapters: [{ title: "Bonnes pratiques au bureau", durationMin: 5 }],
        },
        status: "APPROVED",
      },
      select: { id: true },
    });
    console.log("MarketplaceModule 'bureau-propre' créé.");
  } else {
    console.log("MarketplaceModule 'bureau-propre' déjà présent.");
  }

  // b) Créer une Saison custom dans le tenant qui lie le module
  // (la métrique marketplaceModulesActive compte les saisons custom
  //  ayant un sourceModuleId non null)
  const saisonSlug = `${moduleSlug}-tenant-${tenant.id.slice(-6)}`;
  let saison = await db.saison.findUnique({
    where: { slug: saisonSlug },
    select: { id: true },
  });
  if (!saison) {
    saison = await db.saison.create({
      data: {
        slug: saisonSlug,
        title: "Bureau propre & écran verrouillé (déployé)",
        description: "Module marketplace déployé depuis bureau-propre.",
        coverEmoji: "🧹",
        order: 999,
        isPublished: true,
        tenantId: tenant.id,
        sourceModuleId: mpModule.id,
      },
      select: { id: true },
    });
    console.log(`Saison custom créée : ${saisonSlug}`);
  } else {
    console.log(`Saison custom déjà présente : ${saisonSlug}`);
  }

  console.log("\n=== Métriques attendues après ce seed ===");
  console.log("- A.5.1, A.5.24, A.6.6 → compliant (documentaire)");
  console.log("- A.7.7  → compliant     (module bureau-propre déployé)");
  console.log("- A.6.8  → partial       (phishingReportRate ≈ 0.3)");
  console.log("- A.6.3  → non_compliant (tenant_score faible, 0% completion)");
  console.log("- A.8.7  → not_assessed  (pas de seuil défini)");
  console.log("\n→ Relance une sync depuis /admin/integrations/ciso-assistant");

  await db.$disconnect();
}

main().catch((err) => {
  console.error("Seed démo échec :", err);
  process.exit(1);
});
