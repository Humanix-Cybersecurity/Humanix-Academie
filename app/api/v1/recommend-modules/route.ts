// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/v1/recommend-modules
//
// Recommande 1-5 modules Humanix pertinents pour traiter une menace
// identifiee. Concu pour repondre a une question RSSI type :
//   "Mon analyse de risque CISO Assistant identifie 'phishing finance'.
//    Quels modules Humanix recommandez-vous ?"
//
// Mapping heuristique mot-cle threat -> slugs de modules Humanix.
// Open source : la table peut etre auditee et etendue.
//
// Auth : API key tenant.

import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Mapping mot-cle (lowercase) -> slugs de saisons / modules Humanix.
// On rangee par ordre de pertinence. Le RSSI peut survoler et choisir.
const THREAT_TO_MODULES: Record<string, string[]> = {
  phishing: [
    "phishing",
    "email-pro",
    "fraude-president",
    "deepfakes",
  ],
  spear_phishing: ["fraude-president", "phishing", "deepfakes"],
  whaling: ["fraude-president", "cyber-dirigeants"],
  vishing: ["fraude-president", "phishing"],
  smishing: ["mobile-smartphone", "phishing"],
  ransomware: ["ransomware", "sauvegardes", "remediation-flash"],
  malware: ["ransomware", "stockage-cloud"],
  data_breach: ["donnees-sensibles", "vie-privee-bureau", "stockage-cloud"],
  password: ["mots-de-passe"],
  credential_stuffing: ["mots-de-passe"],
  social_engineering: ["fraude-president", "phishing", "deepfakes"],
  insider_threat: ["donnees-sensibles", "cyber-collaboration"],
  cloud: ["stockage-cloud", "wifi-reseaux"],
  remote_work: ["teletravail", "wifi-reseaux", "mobile-smartphone"],
  byod: ["mobile-smartphone", "teletravail"],
  shadow_it: ["stockage-cloud", "ia-generative"],
  rgpd: ["donnees-sensibles", "dpo-quotidien", "vie-privee-bureau"],
  nis2: ["nis2-pme", "crise-cyber", "supply-chain"],
  supply_chain: ["supply-chain"],
  ai_misuse: ["ia-generative"],
  visio: ["visios-meetings"],
  meeting: ["visios-meetings"],
  social_media: ["reseaux-sociaux-pro"],
  physical_access: ["acces-physiques"],
  incident_response: ["crise-cyber", "remediation-flash"],
  hr: ["cyber-rh"],
  accounting: ["cyber-compta", "fraude-president"],
  dev: ["cyber-dev"],
};

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9_ -]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function scoreSlugForThreat(query: string): Map<string, number> {
  const tokens = tokenize(query);
  const scores = new Map<string, number>();
  for (const token of tokens) {
    // Match exact sur la clé du mapping
    const directKey = token.replace(/-/g, "_");
    const fromDirect = THREAT_TO_MODULES[directKey];
    if (fromDirect) {
      fromDirect.forEach((slug, i) => {
        scores.set(slug, (scores.get(slug) ?? 0) + (10 - i));
      });
      continue;
    }
    // Match partiel sur les clés (substring)
    for (const [key, slugs] of Object.entries(THREAT_TO_MODULES)) {
      if (key.includes(token) || token.includes(key)) {
        slugs.forEach((slug, i) => {
          scores.set(slug, (scores.get(slug) ?? 0) + (5 - i));
        });
      }
    }
  }
  return scores;
}

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status ?? 401 },
    );
  }
  const tenantId = auth.tenantId!;

  const url = new URL(req.url);
  const query = url.searchParams.get("threat") ?? url.searchParams.get("q");
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "5", 10) || 5, 1),
    20,
  );

  if (!query) {
    return NextResponse.json(
      {
        error: "missing_parameter",
        message:
          "Le paramètre `threat` est obligatoire (texte libre, ex: 'phishing finance' ou 'password reuse').",
      },
      { status: 400 },
    );
  }

  const scores = scoreSlugForThreat(query);
  if (scores.size === 0) {
    return NextResponse.json({
      query,
      recommendations: [],
      meta: {
        tenant_id: tenantId,
        generated_at: new Date().toISOString(),
        note: "Aucun module Humanix matché. Tokens reconnus : voir l'index public /integrations/ciso-assistant.",
      },
    });
  }
  const ranked = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  // Hydrate les saisons depuis la BDD
  const slugs = ranked.map(([slug]) => slug);
  const saisons = await db.saison.findMany({
    where: {
      slug: { in: slugs },
      isPublished: true,
      OR: [{ tenantId: null }, { tenantId }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      coverEmoji: true,
      _count: { select: { episodes: true } },
    },
  });
  const bySlug = Object.fromEntries(saisons.map((s) => [s.slug, s]));

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `https://${req.headers.get("host") ?? "humanix-academie.fr"}`;

  return NextResponse.json({
    query,
    recommendations: ranked
      .map(([slug, score]) => {
        const s = bySlug[slug];
        if (!s) return null;
        return {
          slug: s.slug,
          title: s.title,
          description: s.description,
          emoji: s.coverEmoji,
          episodes_count: s._count.episodes,
          relevance_score: score,
          url: `${baseUrl}/apprendre/${s.slug}`,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null),
    meta: {
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
      query_tokens: tokenize(query),
    },
  });
}
