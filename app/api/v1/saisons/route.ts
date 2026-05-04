// GET /api/v1/saisons — catalogue actif pour ce tenant
import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await authenticateApiKey(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });

  // Multi-tenant : on n'expose que les saisons globales (tenantId null)
  // + les saisons custom du tenant courant. Pas celles d'autres tenants.
  const [saisons, configs] = await Promise.all([
    db.saison.findMany({
      where: {
        isPublished: true,
        OR: [{ tenantId: null }, { tenantId: a.tenantId! }],
      },
      include: { episodes: { where: { isPublished: true } } },
    }),
    db.tenantSaisonConfig.findMany({ where: { tenantId: a.tenantId! } }),
  ]);

  const cfg = new Map(configs.map((c) => [c.saisonId, c]));

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
