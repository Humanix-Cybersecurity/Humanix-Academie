// SPDX-License-Identifier: AGPL-3.0-or-later
// Generation auto du /sitemap.xml par Next.js App Router.
// Cf. https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
//
// On liste les pages publiques marketing - celles qu'on veut faire indexer
// par Google / Bing / Qwant / Ecosia. Pas les zones logues (/admin, /apprendre,
// /profil, etc.) qui sont déjà en disallow dans robots.ts.
//
// Le sitemap est COMPLETE dynamiquement avec :
//   - Les articles de la librairie (/librairie/[slug]) -> vitrine SEO
//   - Les anecdotes publiees (/anecdotes/[slug]) -> dernieres news
//   - Les experts publics (/experts/[slug]) -> profils contributeurs
//   - Les incidents urgence-cyber (/urgence-cyber/[slug]) -> hub d'urgence
//
// Priorites :
//   - 1.0 : page d'accueil (la plus importante)
//   - 0.9 : pages strategiques (tarifs, demo, comparatif, dpo)
//   - 0.7 : pages identite (manifeste, sécurité, communaute, presse)
//   - 0.5 : outils gratuits (audit-flash, cyber-meteo, anecdotes, observatoire)
//   - 0.3 : pages legales (mentions, cgv, cgu, cookies, confidentialite)

import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { INCIDENTS } from "@/lib/urgence-cyber/incidents";

const PROD_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";

type SitemapEntry = {
  path: string;
  priority: number;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
};

const PAGES: SitemapEntry[] = [
  // Accueil
  { path: "/", priority: 1.0, changeFrequency: "weekly" },

  // Pages strategiques
  { path: "/tarifs", priority: 0.9, changeFrequency: "monthly" },
  { path: "/demo", priority: 0.9, changeFrequency: "monthly" },
  { path: "/comparatif", priority: 0.9, changeFrequency: "monthly" },
  { path: "/ressources", priority: 0.9, changeFrequency: "weekly" },
  { path: "/dpo", priority: 0.9, changeFrequency: "monthly" },
  { path: "/pour-les-daf", priority: 0.9, changeFrequency: "monthly" },

  // Pages identite & valeurs
  { path: "/manifeste", priority: 0.8, changeFrequency: "monthly" },
  { path: "/communaute", priority: 0.8, changeFrequency: "weekly" },
  { path: "/presse", priority: 0.7, changeFrequency: "monthly" },
  { path: "/securite", priority: 0.7, changeFrequency: "monthly" },
  { path: "/securite/rapport-audit", priority: 0.6, changeFrequency: "monthly" },
  { path: "/securite/audits-externes", priority: 0.6, changeFrequency: "monthly" },
  { path: "/integrations", priority: 0.7, changeFrequency: "monthly" },
  { path: "/famille", priority: 0.7, changeFrequency: "monthly" },
  { path: "/experts", priority: 0.6, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },

  // Outils gratuits / lead gen
  { path: "/librairie", priority: 0.9, changeFrequency: "weekly" },
  { path: "/audit-flash", priority: 0.7, changeFrequency: "monthly" },
  { path: "/diagnostic-nis2", priority: 0.8, changeFrequency: "monthly" },
  { path: "/cyber-meteo", priority: 0.6, changeFrequency: "hourly" },
  { path: "/observatoire-fuites", priority: 0.6, changeFrequency: "daily" },
  { path: "/anecdotes", priority: 0.6, changeFrequency: "weekly" },
  { path: "/urgence-cyber", priority: 0.7, changeFrequency: "monthly" },

  // Badges Detective publics (Mode Enqueteur partage social).
  // Tres faible priorite SEO car ces pages sont surtout cibles de
  // partage direct (LinkedIn/X), pas de crawl Google profond.
  { path: "/badges/detective/detective-junior", priority: 0.4, changeFrequency: "yearly" },
  { path: "/badges/detective/detective-confirme", priority: 0.4, changeFrequency: "yearly" },
  { path: "/badges/detective/cyber-sherlock", priority: 0.4, changeFrequency: "yearly" },
  { path: "/badges/detective/maitre-detective", priority: 0.4, changeFrequency: "yearly" },

  // Auth (publiques)
  { path: "/connexion", priority: 0.4, changeFrequency: "yearly" },
  { path: "/signup", priority: 0.5, changeFrequency: "yearly" },

  // Legal
  { path: "/mentions-legales", priority: 0.3, changeFrequency: "yearly" },
  { path: "/confidentialite", priority: 0.3, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.3, changeFrequency: "yearly" },
  { path: "/cgv", priority: 0.3, changeFrequency: "yearly" },
  { path: "/cgu", priority: 0.3, changeFrequency: "yearly" },
  { path: "/accessibilite", priority: 0.3, changeFrequency: "yearly" },
];

// La fonction est async pour autoriser les requetes Prisma (anecdotes,
// experts). En cas de DB down au moment de la generation, on degrade
// gracieusement vers la liste statique sans planter la build.
//
// Pendant `next build`, la DB n'est generalement pas accessible (CI sans
// service postgres, build Docker en multi-stage, etc.) - on skip les
// requetes DB completement plutot que de laisser Prisma logger
// "prisma:error Invalid prisma.X.findMany() invocation". Le sitemap est
// rendu dynamiquement au runtime (cf. route flag ƒ dans la build output),
// donc skip en build n'a aucun impact sur la version servie aux crawlers.
const IS_BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = PAGES.map((p) => ({
    url: `${PROD_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // Incidents urgence-cyber (statiques en code, pas en DB)
  const urgenceEntries: MetadataRoute.Sitemap = INCIDENTS.map((i) => ({
    url: `${PROD_URL}/urgence-cyber/${i.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  // Articles de la librairie (vitrine SEO publique).
  // Priorite 0.7 par article pour aider le crawler a hierarchiser les
  // URLs les plus susceptibles d'apporter du trafic organique.
  let libraryEntries: MetadataRoute.Sitemap = [];
  if (!IS_BUILD_PHASE) {
    try {
      const articles = await db.libraryArticle.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
        orderBy: { viewCount: "desc" },
        take: 500,
      });
      libraryEntries = articles.map((a) => ({
        url: `${PROD_URL}/librairie/${a.slug}`,
        lastModified: a.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }));
    } catch (err) {
      console.warn("sitemap: library lookup failed, skipping", err);
    }
  }

  // Anecdotes publiees (dynamiques, depuis DB)
  let anecdoteEntries: MetadataRoute.Sitemap = [];
  if (!IS_BUILD_PHASE) {
    try {
      const anecdotes = await db.weeklyAnecdote.findMany({
        where: { isActive: true, publishedAt: { not: null } },
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: "desc" },
        take: 200,
      });
      anecdoteEntries = anecdotes.map((a) => ({
        url: `${PROD_URL}/anecdotes/${a.slug}`,
        lastModified: a.updatedAt,
        changeFrequency: "yearly" as const,
        priority: 0.5,
      }));
    } catch (err) {
      // DB down ou ENV manquant au runtime : on degrade sans planter.
      console.warn("sitemap: anecdotes lookup failed, skipping", err);
    }
  }

  // Experts publics (profils marketplace)
  let expertEntries: MetadataRoute.Sitemap = [];
  if (!IS_BUILD_PHASE) {
    try {
      const experts = await db.expertProfile.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
        take: 200,
      });
      expertEntries = experts.map((e) => ({
        url: `${PROD_URL}/experts/${e.slug}`,
        lastModified: e.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      }));
    } catch (err) {
      console.warn("sitemap: experts lookup failed, skipping", err);
    }
  }

  return [
    ...staticEntries,
    ...libraryEntries,
    ...urgenceEntries,
    ...anecdoteEntries,
    ...expertEntries,
  ];
}
