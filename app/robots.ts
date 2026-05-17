// SPDX-License-Identifier: AGPL-3.0-or-later
// Generation auto du /robots.txt par Next.js App Router.
// Cf. https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
//
// Strategie :
//   - Indexation libre des pages publiques marketing (/, /tarifs, /demo,
//     /comparatif, /manifeste, /lancement-oss, /dpo, /communaute, /presse,
//     etc.)
//   - Disallow sur les zones logue / admin / API (pas de sens pour un crawler)
//   - Disallow explicite sur /api/* (RGPD : pas d'indexation involontaire)
//   - Pointe vers le sitemap

import type { MetadataRoute } from "next";

const PROD_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/superadmin/",
          "/api/",
          "/profil",
          "/profil/",
          "/apprendre",
          "/apprendre/",
          // /librairie est INDEXABLE (vitrine SEO publique).
          "/boutique",
          "/marketplace",
          "/marketplace/",
          "/classement",
          "/saisons/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${PROD_URL}/sitemap.xml`,
    host: PROD_URL,
  };
}
