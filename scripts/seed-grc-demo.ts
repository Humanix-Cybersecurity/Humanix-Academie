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

  // === 4. Activer 3 users avec un peu de progression (boost tenant_score) ===
  // Objectif : passer A.6.3 (tenant_score) de non_compliant -> partial.
  // Formule tenant_score = activationRate*0.4 + completionRate*0.4 + avgQuiz*0.2
  // Avec 3 users actifs sur 10 (0.3), 5 progress completed sur ~1600
  // (completionRate très faible), quiz à 80% (0.8) -> score ≈ 0.16. Encore
  // non_compliant. On simule plutot des progress completed pour avoir une
  // metric "premiers pas" plausible.
  // Strategie simplifiee : creer des progress completed sur quelques episodes
  // pour faire monter completionRate juste assez pour atteindre partial
  // (seuil 0.4 sur A.6.3 = tenant_score).
  //
  // Au lieu de jouer avec les chiffres, on cible direct une signature de
  // demo claire : on ajoute 2 controles affaiblis facilement identifiables.

  // 4a. Ajouter 4 events phishing.report supplementaires -> phishingReportRate
  //     passe de 0.3 a 0.7. A.6.8 bascule de partial -> compliant.
  //     -> Pour conserver A.6.8 en partial, on garde 3 events.
  // On laisse phishing report a 3 (partial).

  // 4b. Ne pas creer le marketplace module "phishing" -> conserve A.8.7
  //     en not_assessed. (deja le cas)

  // 4c. Activer 4 users LEARNER + creer quelques Progress completed pour
  //     que tenant_score remonte sans atteindre 0.7. Resultat attendu :
  //     A.6.3 reste non_compliant mais avec un score visible (pas 0/100).
  const usersToActivate = userIds.slice(0, 4);
  const firstSaison = await db.saison.findFirst({
    where: { isPublished: true },
    include: { episodes: { select: { id: true }, take: 5 } },
  });
  let progressCreated = 0;
  if (firstSaison && firstSaison.episodes.length > 0) {
    for (const userId of usersToActivate) {
      for (const ep of firstSaison.episodes.slice(0, 3)) {
        await db.progress.upsert({
          where: { userId_episodeId: { userId, episodeId: ep.id } },
          create: {
            userId,
            episodeId: ep.id,
            saisonId: firstSaison.id,
            tenantId: tenant.id,
            status: "COMPLETED",
            quizScorePct: 75,
            completedAt: new Date(),
          },
          update: {},
        });
        progressCreated += 1;
      }
    }
  }
  console.log(
    `Progress completed : ${progressCreated} records (${usersToActivate.length} users x 3 episodes)`,
  );

  console.log("\n=== Métriques attendues après ce seed ===");
  console.log("- A.5.1, A.5.24, A.6.6 → compliant     (documentaire)");
  console.log("- A.7.7  → compliant     (module bureau-propre déployé)");
  console.log("- A.6.8  → partial       (phishingReportRate ≈ 0.3)");
  console.log("- A.6.3  → non_compliant (tenant_score faible, ~0.05)");
  console.log("- A.8.7  → not_assessed  (pas de seuil défini)");
  console.log("\n=== Trigger RiskScenario (v1.4) ===");
  console.log("nbPartial + nbNonCompliant = 1 + 1 = 2 >= 2 → trigger déclenchement précoce");
  console.log("→ RiskScenario auto-créé côté CISO Assistant si toggle activé.");
  console.log("\n→ Relance une sync depuis /admin/integrations/ciso-assistant");

  await db.$disconnect();
}

main().catch((err) => {
  console.error("Seed démo échec :", err);
  process.exit(1);
});
