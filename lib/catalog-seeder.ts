// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Seeder reutilisable du catalog partage (saisons + episodes + boutique +
// achievements + tenant Communaute). Idempotent : utilise des upsert par slug.
//
// CONTEXTE :
//   Le seed historique (prisma/seed.ts) etait monolithique et n'etait execute
//   qu'au boot du conteneur Docker, et uniquement si DEMO_MODE=true. Cela
//   signifiait qu'en prod, les ajouts de nouveaux badges / items boutique /
//   saisons NE se propageaient JAMAIS automatiquement en BDD.
//
//   On a extrait ici la partie "catalog universel" (qui s'execute en prod
//   ET en demo) pour la rendre appelable depuis :
//   1. prisma/seed.ts (le seed historique, pour compat ligne de commande)
//   2. app/superadmin/catalog/page.tsx (bouton UI "Re-importer le catalog")
//   3. Eventuellement futur cron post-deploy
//
// CE QUI EST SEEDE :
//   - Saisons + Episodes (depuis loadCatalogSaisons() qui resout commercial
//     ou demo selon DEMO_MODE et la presence de content-pro/)
//   - Items boutique (SHOP_CATALOG depuis lib/shop.ts)
//   - Achievements / badges (ACHIEVEMENTS_CATALOG depuis lib/achievements/catalog.ts)
//   - Tenant Communaute (slug stable "humanix-community")
//
// CE QUI N'EST PAS SEEDE :
//   - Library articles (seedLibrary) — declenche par le seed historique
//     car peut etre lourd (Open Core dynamic require).
//   - Anecdotes (seedAnecdotes) — idem.
//   - Fake users + tenant demo — strictement DEMO_MODE=true.
//
// IDEMPOTENCE :
//   Chaque entite est upserted par son slug. Re-executer ne cree pas de
//   doublons. Les nouveaux champs (titre, description, prix, etc.) sont
//   appliques en update. Les anciens slugs en BDD non presents dans les
//   catalogs JS NE SONT PAS supprimes — un badge retire du code reste en
//   BDD (les UserAchievement existants ne sont pas casses). Pour purger un
//   badge obsolete, le marquer isActive=false manuellement ou ajouter un
//   script de cleanup dedie.

import {
  PrismaClient,
  ItemCategory,
  type Saison,
  type Episode,
} from "@prisma/client";
import { SHOP_CATALOG } from "@/lib/shop";
import { ACHIEVEMENTS_CATALOG } from "@/lib/achievements/catalog";
import { PHISHING_TEMPLATES } from "@/lib/phishing";
import { loadCatalogSaisons } from "@/prisma/seed-data-loader";
import {
  rewardsFor,
  validateCatalog,
} from "@/prisma/catalog-saisons-shared";
import { tagsForSaison } from "@/prisma/catalog-tags";
import {
  COMMUNITY_TENANT_SLUG,
  COMMUNITY_TENANT_NAME,
  COMMUNITY_TENANT_PLAN,
} from "@/lib/tenant-community";

export type SeedCatalogResult = {
  saisons: number;
  episodes: number;
  shopItems: number;
  achievements: number;
  /** Phase 0 (juin 2026) : templates phishing platform-wide migres en BDD */
  phishingTemplates: number;
  catalogSource: "commercial" | "demo";
  durationMs: number;
  communityTenantSlug: string;
};

/**
 * Synchronise le catalog partage (saisons, episodes, boutique, achievements,
 * tenant Communaute) dans la BDD. Idempotent.
 *
 * Le client Prisma est passe en parametre pour permettre la reutilisation
 * dans la transaction d'un caller superieur si besoin (ex. une route admin
 * qui veut wrapper plusieurs operations).
 *
 * @throws en cas d'erreur Prisma. L'appelant doit gerer (rollback ou log).
 */
export async function seedCatalog(
  prisma: PrismaClient,
): Promise<SeedCatalogResult> {
  const start = Date.now();

  // ----- 1. Saisons + Episodes (via Open Core loader) -----
  const { saisons: catalogSaisons, source: catalogSource } =
    loadCatalogSaisons();
  validateCatalog(catalogSaisons);

  const saisonRecords = new Map<string, Saison>();
  const episodeRecords = new Map<string, Episode>();
  for (const s of catalogSaisons) {
    const tags = tagsForSaison(s.slug);
    const dbS = await prisma.saison.upsert({
      where: { slug: s.slug },
      update: {
        title: s.title,
        description: s.description,
        coverEmoji: s.coverEmoji,
        order: s.order,
        audience: s.audience,
        tags,
      },
      create: {
        slug: s.slug,
        title: s.title,
        description: s.description,
        coverEmoji: s.coverEmoji,
        order: s.order,
        audience: s.audience,
        tags,
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

  // ----- 2. Items boutique -----
  // Saisonnalite : si un item a un seasonalWindow, on convertit en
  // availableFrom/availableUntil pour l'annee courante. Le cron de remise-a-jour
  // annuelle (a faire) avancera l'annee chaque 1er jan.
  const currentYear = new Date().getUTCFullYear();
  for (const it of SHOP_CATALOG) {
    let availableFrom: Date | null = null;
    let availableUntil: Date | null = null;
    if (it.seasonalWindow) {
      const w = it.seasonalWindow;
      availableFrom = new Date(
        Date.UTC(currentYear, w.fromMonth - 1, w.fromDay),
      );
      const yearTo =
        w.toMonth < w.fromMonth ? currentYear + 1 : currentYear;
      availableUntil = new Date(
        Date.UTC(yearTo, w.toMonth - 1, w.toDay + 1),
      );
    }
    await prisma.shopItem.upsert({
      where: { slug: it.slug },
      update: {
        name: it.name,
        emoji: it.emoji,
        price: it.price,
        minLevel: it.minLevel,
        description: it.description,
        rarity: it.rarity,
        availableFrom,
        availableUntil,
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
        availableFrom,
        availableUntil,
      },
    });
  }

  // ----- 3. Achievements (badges) -----
  // Le slug est l'identifiant stable, le reste peut evoluer (tweak titres,
  // nouveaux badges) sans casser les UserAchievement existants.
  for (const a of ACHIEVEMENTS_CATALOG) {
    await prisma.achievement.upsert({
      where: { slug: a.slug },
      update: {
        title: a.title,
        emoji: a.emoji,
        description: a.description,
        category: a.category,
        rarity: a.rarity,
        points: a.points,
        isSecret: a.isSecret,
        isActive: true,
      },
      create: {
        slug: a.slug,
        title: a.title,
        emoji: a.emoji,
        description: a.description,
        category: a.category,
        rarity: a.rarity,
        points: a.points,
        isSecret: a.isSecret,
      },
    });
  }

  // ----- 4. Phishing Email Templates (platform-wide, juin 2026) -----
  // Migration des 3 templates hardcoded de lib/phishing.ts vers la BDD.
  // tenantId=null => disponibles pour tous les tenants. Les admins
  // pourront override par slug (PhishingEmailTemplate @@unique(tenantId,slug)).
  //
  // Astuce de migration : on appelle emailHtml(firstName, trackingUrl) avec
  // des PLACEHOLDERS string ("{firstName}" / "{trackingUrl}"). Comme ce
  // sont des strings truthy non vides, les expressions defensives type
  // `${firstName || "Utilisateur"}` retournent bien "{firstName}". Le HTML
  // resultant contient les placeholders au bon endroit, pret pour le
  // remplacement au moment du lancement.
  for (const tpl of PHISHING_TEMPLATES) {
    const bodyTemplate = tpl.emailHtml("{firstName}", "{trackingUrl}");
    // Champs communs create/update.
    const fields = {
      name: tpl.name,
      description: tpl.description,
      emoji: tpl.emoji,
      difficulty: tpl.difficulty,
      channel: "EMAIL" as const,
      emailSubject: tpl.emailSubject,
      emailFromAddr: tpl.emailFrom,
      emailFromName: tpl.emailFrom.split("@")[0] ?? "Service IT",
      emailHtml: bodyTemplate,
      markers: tpl.markers,
      remediationSaisonSlug: tpl.remediationEpisode?.saisonSlug,
      remediationEpisodeSlug: tpl.remediationEpisode?.episodeSlug,
      remediationLabel: tpl.remediationEpisode?.label,
      remediationDurationMinutes: tpl.remediationEpisode?.durationMinutes,
      isActive: true,
    };
    // IMPORTANT : Prisma REFUSE null dans une cle unique composite cote `where`
    // (tenantId_slug) -> `Argument tenantId must not be null`. Pour les
    // templates platform-wide (tenantId = null) on ne peut donc PAS utiliser
    // upsert. On resout via findFirst(tenantId:null, slug) puis update/create.
    const existing = await prisma.phishingEmailTemplate.findFirst({
      where: { tenantId: null, slug: tpl.id },
      select: { id: true },
    });
    if (existing) {
      await prisma.phishingEmailTemplate.update({
        where: { id: existing.id },
        data: fields,
      });
    } else {
      await prisma.phishingEmailTemplate.create({
        data: { tenantId: null, slug: tpl.id, ...fields },
      });
    }
  }

  // ----- 5. Tenant Communaute -----
  // Unique tenant non-payant de la plateforme cloud, hebergeant tous les
  // LEARNERs gratuits. Toujours seede (prod ET demo). Cf. lib/tenant-community.ts.
  await prisma.tenant.upsert({
    where: { slug: COMMUNITY_TENANT_SLUG },
    update: {
      name: COMMUNITY_TENANT_NAME,
      // Pas de update du plan : si quelqu'un l'a modifie manuellement, on
      // respecte la valeur en BDD pour eviter de casser un environnement.
    },
    create: {
      slug: COMMUNITY_TENANT_SLUG,
      name: COMMUNITY_TENANT_NAME,
      plan: COMMUNITY_TENANT_PLAN,
    },
  });

  return {
    saisons: catalogSaisons.length,
    episodes: episodeRecords.size,
    shopItems: SHOP_CATALOG.length,
    achievements: ACHIEVEMENTS_CATALOG.length,
    phishingTemplates: PHISHING_TEMPLATES.length,
    catalogSource,
    durationMs: Date.now() - start,
    communityTenantSlug: COMMUNITY_TENANT_SLUG,
  };
}
