// SPDX-License-Identifier: AGPL-3.0-or-later
// Generation auto du /sitemap.xml par Next.js App Router.
// Cf. https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
//
// On liste les pages publiques marketing - celles qu'on veut faire indexer
// par Google / Bing / Qwant / Ecosia. Pas les zones logues (/admin, /apprendre,
// /profil, etc.) qui sont déjà en disallow dans robots.ts.
//
// Priorites :
//   - 1.0 : page d'accueil (la plus importante)
//   - 0.9 : pages strategiques (tarifs, demo, comparatif, lancement-oss, dpo)
//   - 0.7 : pages identite (manifeste, sécurité, communaute, presse)
//   - 0.5 : outils gratuits (audit-flash, cyber-meteo, anecdotes, observatoire)
//   - 0.3 : pages legales (mentions, cgv, cgu, cookies, confidentialite)

import type { MetadataRoute } from "next";

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
  { path: "/integrations", priority: 0.7, changeFrequency: "monthly" },
  { path: "/famille", priority: 0.7, changeFrequency: "monthly" },
  { path: "/experts", priority: 0.6, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },

  // Outils gratuits / lead gen
  { path: "/audit-flash", priority: 0.7, changeFrequency: "monthly" },
  { path: "/cyber-meteo", priority: 0.6, changeFrequency: "hourly" },
  { path: "/observatoire-fuites", priority: 0.6, changeFrequency: "daily" },
  { path: "/anecdotes", priority: 0.6, changeFrequency: "weekly" },
  { path: "/urgence-cyber", priority: 0.7, changeFrequency: "monthly" },

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

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGES.map((p) => ({
    url: `${PROD_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
