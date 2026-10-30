// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/v1/saisons - catalogue actif pour ce tenant
import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await authenticateApiKey(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });

  // Multi-tenant : on n'expose que les saisons globales (tenantId null)
  // + les saisons custom du tenant courant. Pas celles d'autres tenants.
  const [saisons, configs, affectations] = await Promise.all([
    db.saison.findMany({
      where: {
        isPublished: true,
        OR: [{ tenantId: null }, { tenantId: a.tenantId! }],
      },
      include: { episodes: { where: { isPublished: true } } },
    }),
    db.tenantSaisonConfig.findMany({ where: { tenantId: a.tenantId! } }),
    // Prescription par groupes : slugs des groupes vises par chaque saison
    // (vide = toute l'organisation). Cf. lib/catalogue/prescription.ts.
    db.tenantSaisonGroupe.findMany({
      where: { tenantId: a.tenantId! },
      select: { saisonId: true, group: { select: { slug: true } } },
    }),
  ]);

  const cfg = new Map(configs.map((c) => [c.saisonId, c]));
  const groupesParSaison = new Map<string, string[]>();
  for (const aff of affectations) {
    const liste = groupesParSaison.get(aff.saisonId) ?? [];
    liste.push(aff.group.slug);
    groupesParSaison.set(aff.saisonId, liste);
  }

  const data = saisons.map((s) => {
    const c = cfg.get(s.id);
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      coverEmoji: s.coverEmoji,
      order: c?.customOrder ?? s.order,
      isActive: c ? c.isActive : true,
      isMandatory: c?.isMandatory ?? false,
      groupes: groupesParSaison.get(s.id) ?? [],
      episodes: s.episodes.map((e) => ({
        id: e.id,
        slug: e.slug,
        title: e.title,
        order: e.order,
        durationMinutes: e.durationMinutes,
        xpReward: e.xpReward,
      })),
    };
  });

  return NextResponse.json({
    data,
    meta: { count: data.length, tenantId: a.tenantId },
  });
}
