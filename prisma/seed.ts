// Seed riche pour POC démo
import {
  PrismaClient,
  ProgressStatus,
  Role,
  ItemCategory,
} from "@prisma/client";
import { getLevel, computeCoinsEarned } from "../lib/levels";
import { SHOP_CATALOG } from "../lib/shop";
import { computeContentHash } from "../lib/marketplace/integrity";
import { LIBRARY_ARTICLES } from "../lib/library-seed";
import { MARKETPLACE_MODULES } from "../lib/marketplace-seed";
import {
  CATALOG_SAISONS,
  rewardsFor,
  validateCatalog,
} from "./catalog-saisons";
import { seedAnecdotes } from "./seed-anecdotes";

const prisma = new PrismaClient();

// Le catalogue est externalise dans prisma/catalog-saisons.ts pour rester
// editable independamment du seed. 25 saisons x ~6 episodes = 150 modules
// officiels. Combine avec la marketplace = 180 modules d'apprentissage.

const FAKE_USERS = [
  {
    name: "Sophie Martin",
    email: "sophie@demo-pme.fr",
    role: Role.ADMIN,
    service: "Direction",
    maturity: 0.9,
    isActive: true,
  },
  {
    name: "Yanis Bernard",
    email: "yanis@demo-pme.fr",
    role: Role.LEARNER,
    service: "Commercial",
    maturity: 0.4,
    isActive: true,
  },
  {
    name: "Christine Dubois",
    email: "christine@demo-pme.fr",
    role: Role.LEARNER,
    service: "Compta",
    maturity: 0.95,
    isActive: true,
  },
  {
    name: "Mohamed Benali",
    email: "mohamed@demo-pme.fr",
    role: Role.LEARNER,
    service: "Production",
    maturity: 0.85,
    isActive: true,
  },
  {
    name: "Léa Garcia",
    email: "lea@demo-pme.fr",
    role: Role.MANAGER,
    service: "RH",
    maturity: 0.6,
    isActive: true,
  },
  {
    name: "Pierre Lefebvre",
    email: "pierre@demo-pme.fr",
    role: Role.LEARNER,
    service: "Compta",
    maturity: 0.5,
    isActive: true,
  },
  {
    name: "Julie Moreau",
    email: "julie@demo-pme.fr",
    role: Role.LEARNER,
    service: "Commercial",
    maturity: 0.4,
    isActive: true,
  },
  {
    name: "Karim Amrani",
    email: "karim@demo-pme.fr",
    role: Role.LEARNER,
    service: "IT",
    maturity: 1.0,
    isActive: true,
  },
  {
    name: "Camille Petit",
    email: "camille@demo-pme.fr",
    role: Role.LEARNER,
    service: "Direction",
    maturity: 0.3,
    isActive: true,
  },
  {
    name: "Olivier Roux",
    email: "olivier@demo-pme.fr",
    role: Role.LEARNER,
    service: "Commercial",
    maturity: 0.65,
    isActive: true,
  },
  {
    name: "Nadia Mansouri",
    email: "nadia@demo-pme.fr",
    role: Role.LEARNER,
    service: "Production",
    maturity: 0.25,
    isActive: true,
  },
  {
    name: "Antoine Vidal",
    email: "antoine@demo-pme.fr",
    role: Role.LEARNER,
    service: "RH",
    maturity: 0,
    isActive: false,
  },
  {
    name: "Florian (Humanix)",
    email: "contact@humanix-cybersecurity.fr",
    role: Role.SUPERADMIN,
    service: "Direction",
    maturity: 1.0,
    isActive: true,
  },
];

async function main() {
  console.log("🌱 Seed Humanix Académie v0.3...");

  // Plan initial : "essentielle" (le palier standard PME, montre la majorité
  // des features sans verrou). L'utilisateur peut switcher en live depuis
  // /demo pour tester Solo / Pro / Premium.
  // En update on NE CHANGE PAS le plan : on respecte le dernier choix demo.
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-pme" },
    update: { name: "PME Démo" },
    create: { slug: "demo-pme", name: "PME Démo", plan: "essentielle" },
  });
  console.log(`  Tenant ✓ (${tenant.slug})`);

  // Saisons + episodes : on charge tout depuis le catalogue externalise.
  // 25 saisons x ~6 episodes = 150 modules officiels.
  const integrity = validateCatalog();
  console.log(
    `  Catalogue : ${integrity.totalSaisons} saisons / ${integrity.totalEpisodes} episodes`,
  );

  const saisonRecords = new Map<string, any>();
  const episodeRecords = new Map<string, any>();
  for (const s of CATALOG_SAISONS) {
    const dbS = await prisma.saison.upsert({
      where: { slug: s.slug },
      update: {
        title: s.title,
        description: s.description,
        coverEmoji: s.coverEmoji,
        order: s.order,
      },
      create: {
        slug: s.slug,
        title: s.title,
        description: s.description,
        coverEmoji: s.coverEmoji,
        order: s.order,
      },
    });
    saisonRecords.set(s.slug, dbS);
    let order = 1;
    for (const ep of s.episodes) {
      const r = rewardsFor(ep.difficulty);
      const dbE = await prisma.episode.upsert({
        where: { saisonId_slug: { saisonId: dbS.id, slug: ep.slug } },
        update: {
          title: ep.title,
          order,
          durationMinutes: ep.durationMinutes,
          xpReward: r.xpReward,
          coinsReward: r.coinsReward,
        },
        create: {
          saisonId: dbS.id,
          slug: ep.slug,
          title: ep.title,
          order,
          durationMinutes: ep.durationMinutes,
          xpReward: r.xpReward,
          coinsReward: r.coinsReward,
        },
      });
      episodeRecords.set(`${s.slug}/${ep.slug}`, dbE);
      order++;
    }
  }
  console.log(
    `  Saisons ✓ (${CATALOG_SAISONS.length} saisons / ${episodeRecords.size} episodes)`,
  );

  // Tenant config : phishing obligatoire
  await prisma.tenantSaisonConfig.upsert({
    where: {
      tenantId_saisonId: {
        tenantId: tenant.id,
        saisonId: saisonRecords.get("phishing").id,
      },
    },
    update: { isMandatory: true },
    create: {
      tenantId: tenant.id,
      saisonId: saisonRecords.get("phishing").id,
      isMandatory: true,
      isActive: true,
    },
  });

  // Catalogue boutique
  const shopItemsBySlug = new Map<string, any>();
  for (const it of SHOP_CATALOG) {
    const dbItem = await prisma.shopItem.upsert({
      where: { slug: it.slug },
      update: {
        name: it.name,
        emoji: it.emoji,
        price: it.price,
        minLevel: it.minLevel,
        description: it.description,
        rarity: it.rarity,
      },
      create: {
        slug: it.slug,
        name: it.name,
        emoji: it.emoji,
        category: it.category as ItemCategory,
        price: it.price,
        minLevel: it.minLevel,
        description: it.description,
        rarity: it.rarity,
      },
    });
    shopItemsBySlug.set(it.slug, dbItem);
  }
  console.log(`  Boutique ✓ (${SHOP_CATALOG.length} items)`);

  // Users + progressions
  for (const u of FAKE_USERS) {
    const dbUser = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        service: u.service,
        isActive: u.isActive,
        tenantId: tenant.id,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        service: u.service,
        isActive: u.isActive,
        tenantId: tenant.id,
      },
    });

    const allEpisodes = [...episodeRecords.entries()];
    const targetCount = Math.floor(allEpisodes.length * u.maturity);
    let totalScore = 0;
    let totalCoins = 0;

    for (let i = 0; i < targetCount; i++) {
      const [key, ep] = allEpisodes[i];
      const saisonSlug = key.split("/")[0];
      const saison = saisonRecords.get(saisonSlug);
      const score = Math.floor(40 + Math.random() * 50 * u.maturity);
      const daysAgo = Math.floor(Math.random() * 14);
      const completedAt = new Date();
      completedAt.setDate(completedAt.getDate() - daysAgo);

      await prisma.progress.upsert({
        where: { userId_episodeId: { userId: dbUser.id, episodeId: ep.id } },
        update: {
          status: ProgressStatus.COMPLETED,
          score,
          bestScore: score,
          completedAt,
        },
        create: {
          tenantId: tenant.id,
          userId: dbUser.id,
          saisonId: saison.id,
          episodeId: ep.id,
          status: ProgressStatus.COMPLETED,
          score,
          bestScore: score,
          attempts: 1,
          startedAt: completedAt,
          completedAt,
        },
      });

      totalScore += score;
      totalCoins += computeCoinsEarned(score, score >= 80);
    }

    const level = getLevel(totalScore);
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { level: level.id, coins: totalCoins },
    });

    // Demo : equipper Sophie + Karim avec quelques items pour la demo
    if (u.email === "sophie@demo-pme.fr") {
      await equipForUser(
        dbUser.id,
        ["graduation-cap", "geek-glasses"],
        shopItemsBySlug,
      );
    }
    if (u.email === "karim@demo-pme.fr") {
      await equipForUser(
        dbUser.id,
        ["crown-gold", "shades", "shield", "bg-cyber"],
        shopItemsBySlug,
      );
    }
    if (u.email === "christine@demo-pme.fr") {
      await equipForUser(
        dbUser.id,
        ["wizard-hat", "bg-aurora"],
        shopItemsBySlug,
      );
    }
  }
  console.log(`  Users ✓ (${FAKE_USERS.length})`);

  // Telemetrie
  const allUsers = await prisma.user.findMany({
    where: { tenantId: tenant.id },
  });
  for (let i = 0; i < 30; i++) {
    const u = allUsers[Math.floor(Math.random() * allUsers.length)];
    await prisma.event.create({
      data: {
        tenantId: tenant.id,
        userId: u.id,
        type: ["episode_started", "choice_made", "quiz_answered"][
          Math.floor(Math.random() * 3)
        ],
        payload: { demo: true },
      },
    });
  }

  // Marketplace : 1 module officiel + 1 contribution communaute (deja approuves)
  await seedMarketplace();

  // Librairie micro-learning
  await seedLibrary();

  // Cyber-Anecdotes du Lundi (4 cas réels documentés, 3 publiées + 1 brouillon)
  await seedAnecdotes(prisma);

  console.log("✅ Seed terminé.");
  console.log("");
  console.log("  Comptes démo :");
  console.log(
    "  - 🛡️ Modérateur : contact@humanix-cybersecurity.fr (SUPERADMIN)",
  );
  console.log("  - 👔 Dirigeante : sophie@demo-pme.fr (admin)");
  console.log("  - 🎮 Apprenant  : yanis@demo-pme.fr (level 1)");
  console.log(
    "  - 🏆 Top user   : karim@demo-pme.fr (level max, items équipés)",
  );
  console.log("  - ⛔ Suspendu   : antoine@demo-pme.fr");
  console.log("");
  console.log("  → http://localhost:3000/demo");
}

async function seedMarketplace() {
  const vincent = await prisma.user.findUnique({
    where: { email: "contact@humanix-cybersecurity.fr" },
  });
  const lea = await prisma.user.findUnique({
    where: { email: "lea@demo-pme.fr" },
  });
  const sophie = await prisma.user.findUnique({
    where: { email: "sophie@demo-pme.fr" },
  });
  if (!vincent || !lea || !sophie) return;

  // Module officiel HumaniX
  const officialPayload = {
    episodes: [
      {
        title: "Le badge oublie au comptoir",
        durationMinutes: 5,
        scenario:
          "Tu rentres au bureau apres ta pause cafe. Tu remarques qu'un visiteur (probablement un livreur, en gilet jaune) attend devant la porte avec un colis. Il sourit et te dit : « Tiens, tu peux me laisser passer ? J'ai oublie mon badge. C'est urgent. »",
        choices: [
          {
            id: "a",
            label: "J'ouvre la porte, c'est evident qu'il a besoin d'entrer",
            outcome: "bad" as const,
            feedback:
              "Tres mauvais reflexe : tu viens de pratiquer du tailgating. Aucun controle d'identite, accees libre a une zone potentiellement sensible.",
            points: -10,
          },
          {
            id: "b",
            label:
              "Je lui demande de patienter et j'appelle l'accueil pour verifier",
            outcome: "good" as const,
            feedback:
              "Excellent ! La verification hors-canal protege contre l'usurpation. Bravo.",
            points: 30,
          },
          {
            id: "c",
            label: "Je le laisse passer mais je le suis du regard",
            outcome: "neutral" as const,
            feedback:
              "Mauvais compromis : tu n'as pas verifie son identite et tu es complice du tailgating.",
            points: -5,
          },
        ],
        debrief:
          "Le tailgating (suivre quelqu'un sans badge) est une technique d'intrusion physique tres efficace : elle marche dans 70 % des cas en France. Reflexe : tout visiteur sans badge doit etre escorte par l'accueil ou pris en charge par un salarie identifie. Pas de honte a refuser : c'est ton job, pas une impolitesse.",
        quiz: [
          {
            question: "Le tailgating consiste a :",
            choices: [
              {
                id: "a",
                label: "Suivre quelqu'un dans une zone securisee sans badge",
                correct: true,
              },
              { id: "b", label: "Voler un badge dans un sac", correct: false },
              {
                id: "c",
                label: "Pirater un systeme de controle d'acces",
                correct: false,
              },
            ],
            explanation:
              "Le tailgating exploite la politesse humaine. C'est l'attaque physique la plus frequente.",
          },
          {
            question: "Si je doute de l'identite d'un visiteur, je :",
            choices: [
              {
                id: "a",
                label: "Appelle l'accueil pour verifier",
                correct: true,
              },
              {
                id: "b",
                label: "Le laisse passer pour eviter le conflit",
                correct: false,
              },
              { id: "c", label: "Demande son CV", correct: false },
            ],
            explanation:
              "Verification hors-canal = appel a l'accueil sur un numero connu.",
          },
        ],
        xpReward: 50,
      },
    ],
  };

  await prisma.marketplaceModule.upsert({
    where: { slug: "securite-physique-bureau" },
    update: {},
    create: {
      slug: "securite-physique-bureau",
      title: "Sécurité physique au bureau",
      description:
        "Tailgating, badges, visiteurs : 3 réflexes anti-intrusion physique.",
      emoji: "🚪",
      category: "autre",
      difficulty: "easy",
      language: "fr",
      authorId: vincent.id,
      authorOrgName: "Humanix Cybersecurity",
      isOfficial: true,
      version: "1.0.0",
      contentHash: computeContentHash(officialPayload),
      payload: officialPayload as any,
      status: "APPROVED",
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: vincent.id,
      license: "PROPRIETARY",
      installCount: 0,
    },
  });

  // Module communaute (auteur Lea)
  const communityPayload = {
    episodes: [
      {
        title: "Reseaux sociaux et e-reputation pro",
        durationMinutes: 6,
        scenario:
          'Tu es commercial. Un "recruteur" t\'aborde sur LinkedIn avec un poste tres interessant et bien paye. Il te demande ton CV detaille, ton organigramme actuel, et la liste de tes 5 plus gros clients pour "valider ta seniorite". Il insiste : "c\'est confidentiel, ne dis rien a tes collegues".',
        choices: [
          {
            id: "a",
            label: "J'envoie tout, l'opportunite est interessante",
            outcome: "bad" as const,
            feedback:
              'Aïe : tu viens de fournir du renseignement strategique. Le "recruteur" est probablement un concurrent ou un attaquant qui prepare une fraude au president.',
            points: -15,
          },
          {
            id: "b",
            label:
              "Je propose un rendez-vous visio prealable pour verifier son identite et l'entreprise cliente",
            outcome: "good" as const,
            feedback:
              "Tres bon reflexe : tu mets une friction qui filtre les arnaques.",
            points: 30,
          },
          {
            id: "c",
            label: "J'envoie le CV mais pas la liste clients",
            outcome: "neutral" as const,
            feedback:
              "Bon reflexe partiel mais tu donnes encore beaucoup d'info. Mieux vaut verifier d'abord.",
            points: 5,
          },
        ],
        debrief:
          "Le faux recruteur LinkedIn est une technique d'OSINT (collecte de renseignement) tres utilisee. Il sert souvent a preparer une attaque (fraude au president, phishing cible) en collectant : ton organigramme, tes clients, ton style d'ecriture. Reflexe : avant de partager des infos professionnelles avec un \"recruteur inconnu\", verifie son profil entreprise, son historique LinkedIn, et demande une visio.",
        quiz: [
          {
            question: "Un faux recruteur cherche a :",
            choices: [
              {
                id: "a",
                label: "Collecter du renseignement sur ton entreprise",
                correct: true,
              },
              {
                id: "b",
                label: "Te proposer un meilleur salaire",
                correct: false,
              },
              { id: "c", label: "Te recruter rapidement", correct: false },
            ],
            explanation:
              "Les faux recruteurs sont une technique d'OSINT pour preparer des attaques cyber.",
          },
          {
            question:
              "Avant de partager des infos pro a un recruteur inconnu :",
            choices: [
              {
                id: "a",
                label: "Je verifie son profil et propose une visio",
                correct: true,
              },
              { id: "b", label: "J'envoie tout sans question", correct: false },
              { id: "c", label: "Je transfert au DRH", correct: false },
            ],
            explanation:
              "La friction (visio prealable) elimine 90 % des faux recruteurs.",
          },
        ],
        xpReward: 50,
      },
    ],
  };

  await prisma.marketplaceModule.upsert({
    where: { slug: "reseaux-sociaux-e-reputation" },
    update: {},
    create: {
      slug: "reseaux-sociaux-e-reputation",
      title: "Réseaux sociaux et e-réputation pro",
      description:
        "Faux recruteurs, OSINT, fuites involontaires : reflexes pour proteger l'info pro sur LinkedIn.",
      emoji: "💼",
      category: "reseaux-sociaux",
      difficulty: "medium",
      language: "fr",
      authorId: lea.id,
      authorOrgName: "PME Démo (RH)",
      isOfficial: false,
      version: "1.0.0",
      contentHash: computeContentHash(communityPayload),
      payload: communityPayload as any,
      status: "APPROVED",
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: vincent.id,
      license: "CC_BY_SA",
      installCount: 0,
    },
  });

  // 1 module en attente de moderation pour la demo
  const pendingPayload = {
    episodes: [
      {
        title: "L'IA generative au bureau",
        durationMinutes: 7,
        scenario:
          "Ton collegue te montre comment il utilise ChatGPT pour rediger des comptes-rendus de reunions clients. Il copie-colle litteralement la transcription audio brute, incluant les noms et chiffres d'affaires.",
        choices: [
          {
            id: "a",
            label: "C'est genial, je fais pareil",
            outcome: "bad" as const,
            feedback:
              "Tu viens d'envoyer des donnees clients confidentielles a un service tiers (US, Patriot Act). Violation potentielle RGPD + clause de confidentialite client.",
            points: -10,
          },
          {
            id: "b",
            label:
              "Je suggere d'utiliser une IA en local ou un service europeen avec contrat",
            outcome: "good" as const,
            feedback:
              "Bonne approche : Mistral Le Chat Pro, Claude/ChatGPT Enterprise, ou IA on-premise. Avec contrat de sous-traitance signe.",
            points: 30,
          },
          {
            id: "c",
            label: "Je m'en fiche, ce sont juste des notes",
            outcome: "bad" as const,
            feedback:
              "Un compte-rendu client = donnee strategique. La fuite peut couter cher commercialement.",
            points: -10,
          },
        ],
        debrief:
          'L\'IA generative est utile mais demande des regles : pas de donnees clients ou personnelles dans des chats publics. Privilegier des solutions en mode "enterprise" avec contrat de sous-traitance, ou mieux des modeles en local.',
        quiz: [
          {
            question: "Coller des notes client dans ChatGPT public est :",
            choices: [
              {
                id: "a",
                label: "Une violation RGPD potentielle",
                correct: true,
              },
              { id: "b", label: "Sans risque", correct: false },
            ],
            explanation:
              "Les donnees envoyees a un service IA tiers sortent du cadre RGPD signe avec ton client.",
          },
        ],
        xpReward: 50,
      },
    ],
  };

  await prisma.marketplaceModule.upsert({
    where: { slug: "ia-generative-pro" },
    update: {},
    create: {
      slug: "ia-generative-pro",
      title: "L'IA générative au bureau",
      description:
        "ChatGPT, Claude, Gemini : ce qu'on peut et ce qu'on ne doit jamais y mettre.",
      emoji: "🤖",
      category: "ia-generative",
      difficulty: "medium",
      language: "fr",
      authorId: lea.id,
      authorOrgName: "PME Démo (RH)",
      isOfficial: false,
      version: "0.1.0",
      contentHash: computeContentHash(pendingPayload),
      payload: pendingPayload as any,
      status: "PENDING_REVIEW",
      submittedAt: new Date(),
      license: "CC_BY",
      installCount: 0,
    },
  });

  // ====================================================================
  // 15 modules supplémentaires (cf. lib/marketplace-seed.ts)
  // Mix d'officiels HumaniX + community (Lea, Sophie) avec divers status.
  // ====================================================================
  const authorMap: Record<"vincent" | "lea" | "sophie", string> = {
    vincent: vincent.id,
    lea: lea.id,
    sophie: sophie.id,
  };
  let createdCount = 0;
  let pendingCount = 0;
  for (const m of MARKETPLACE_MODULES) {
    const isPending = m.status === "PENDING_REVIEW";
    if (isPending) pendingCount++;
    else createdCount++;
    await prisma.marketplaceModule.upsert({
      where: { slug: m.slug },
      update: {},
      create: {
        slug: m.slug,
        title: m.title,
        description: m.description,
        emoji: m.emoji,
        category: m.category,
        difficulty: m.difficulty,
        language: "fr",
        authorId: authorMap[m.author],
        authorOrgName: m.authorOrgName,
        isOfficial: m.isOfficial,
        version: "1.0.0",
        contentHash: computeContentHash(m.payload),
        payload: m.payload as any,
        status: m.status,
        submittedAt: new Date(),
        reviewedAt: isPending ? null : new Date(),
        reviewedById: isPending ? null : vincent.id,
        license: m.license,
        installCount: 0,
      },
    });
  }
  console.log(
    `  Marketplace ✓ (2 modules historiques + ${createdCount} approuvés + ${pendingCount} en modération)`,
  );
}

async function seedLibrary() {
  for (const a of LIBRARY_ARTICLES) {
    await prisma.libraryArticle.upsert({
      where: { slug: a.slug },
      update: {
        title: a.title,
        description: a.description,
        emoji: a.emoji,
        category: a.category,
        audience: a.audience,
        readTimeMinutes: a.readTimeMinutes,
        body: a.body,
        authorName: a.authorName,
      },
      create: {
        slug: a.slug,
        title: a.title,
        description: a.description,
        emoji: a.emoji,
        category: a.category,
        audience: a.audience,
        readTimeMinutes: a.readTimeMinutes,
        body: a.body,
        authorName: a.authorName,
        isPublished: true,
      },
    });
  }
  console.log(`  Librairie ✓ (${LIBRARY_ARTICLES.length} articles)`);
}

async function equipForUser(
  userId: string,
  slugs: string[],
  shopMap: Map<string, any>,
) {
  for (const slug of slugs) {
    const item = shopMap.get(slug);
    if (!item) continue;
    await prisma.userInventory.upsert({
      where: { userId_itemId: { userId, itemId: item.id } },
      update: { isEquipped: true },
      create: { userId, itemId: item.id, isEquipped: true },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
