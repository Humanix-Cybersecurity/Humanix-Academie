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

// La cartographie menace -> saisons vit dans lib/threat-modules.ts : elle est
// partagee avec la boucle fermee (POST /api/integrations/edr-trigger), qui
// doit choisir la meme saison qu'un RSSI aurait choisie a la main.
import { scoreSlugForThreat, tokenize } from "@/lib/threat-modules";

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
