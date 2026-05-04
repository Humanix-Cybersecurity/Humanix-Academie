// SPDX-License-Identifier: AGPL-3.0-or-later
// Repository Prisma + dedup + lazy refresh.

import { db } from "@/lib/db";
import type { BreachSource } from "@prisma/client";
import { scrapeAllSources } from "./parsers";
import { ACTIVE_SOURCES, type ScrapedBreach } from "./types";

// Refresh "lazy" auto-trigger : si la BDD est vide ou périmée (> 24h sans
// nouvelle), on déclenche un scrape en arrière-plan.
const STALENESS_MS = 24 * 3600 * 1000;

// =============================================================================
// QUERY
// =============================================================================

export type BreachListFilter = {
  source?: BreachSource;
  query?: string;
  fromDate?: Date;
};

export async function listRecentBreaches(
  args: {
    limit?: number;
    offset?: number;
    filter?: BreachListFilter;
  } = {},
) {
  const limit = Math.min(args.limit ?? 30, 100);
  const offset = Math.max(args.offset ?? 0, 0);

  // Par défaut on filtre sur les sources actives uniquement (les items des
  // sources désactivées comme FUITESINFOS sont conservés en BDD pour
  // historique mais cachés de l'observatoire public).
  const where: any = {
    isPublished: true,
    source: { in: ACTIVE_SOURCES as any },
  };
  if (args.filter?.source) where.source = args.filter.source;
  if (args.filter?.fromDate) where.incidentDate = { gte: args.filter.fromDate };
  if (args.filter?.query) {
    where.OR = [
      { title: { contains: args.filter.query, mode: "insensitive" } },
      { organization: { contains: args.filter.query, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    db.dataBreach.findMany({
      where,
      orderBy: [{ incidentDate: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    db.dataBreach.count({ where }),
  ]);

  return { items, total };
}

export async function getBreachStats() {
  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const last7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  const [total, last30d, last7d, bySource, lastSync] = await Promise.all([
    db.dataBreach.count({ where: { isPublished: true } }),
    db.dataBreach.count({
      where: { isPublished: true, incidentDate: { gte: last30 } },
    }),
    db.dataBreach.count({
      where: { isPublished: true, incidentDate: { gte: last7 } },
    }),
    db.dataBreach.groupBy({
      by: ["source"],
      where: { isPublished: true },
      _count: { _all: true },
    }),
    db.dataBreach.findFirst({
      orderBy: { scrapedAt: "desc" },
      select: { scrapedAt: true },
    }),
  ]);

  return {
    total,
    last30d,
    last7d,
    bySource: bySource.map((b) => ({
      source: b.source as BreachSource,
      count: b._count._all,
    })),
    lastSync: lastSync?.scrapedAt ?? null,
  };
}

// =============================================================================
// REFRESH (UPSERT)
// =============================================================================

/**
 * Upsert d'un lot de breaches scraped : crée si absent, ignore si présent
 * (dedup via @@unique([source, externalId])).
 *
 * Retourne le nombre d'inserts effectifs.
 */
export async function upsertScraped(args: {
  source: BreachSource;
  items: ScrapedBreach[];
}): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const item of args.items) {
    try {
      await db.dataBreach.upsert({
        where: {
          source_externalId: {
            source: args.source,
            externalId: item.externalId,
          },
        },
        update: {
          // On rafraîchit juste scrapedAt + summary si modif côté source
          scrapedAt: new Date(),
          summary: item.summary ?? undefined,
          recordsExposed: item.recordsExposed ?? undefined,
        },
        create: {
          externalId: item.externalId,
          source: args.source,
          sourceUrl: item.sourceUrl,
          title: item.title,
          organization: item.organization ?? null,
          country: item.country ?? "FR",
          sector: item.sector ?? null,
          incidentDate: item.incidentDate,
          summary: item.summary ?? null,
          recordsExposed: item.recordsExposed ?? null,
          dataTypes: item.dataTypes ?? null,
          severity: item.severity ?? "medium",
        },
      });
    } catch (e: any) {
      // Log précis de l'item qui plante : permet d'identifier le caractère
      // problématique côté source pour adapter sanitizeForDb si besoin.
      const msg = String(e?.message ?? e).slice(0, 300);
      console.warn(
        `[upsertScraped] ${args.source} échec sur item :`,
        JSON.stringify({
          externalId: item.externalId,
          title: item.title.slice(0, 80),
          url: item.sourceUrl.slice(0, 120),
          // Bytes de chaque champ pour repérer les chars exotiques
          titleCodePoints: [...item.title.slice(0, 40)].map((c) =>
            c.codePointAt(0),
          ),
          summaryLen: item.summary?.length ?? 0,
        }),
        "->",
        msg,
      );
      skipped++;
      continue;
    }

    // Distinguer insert vs update (best-effort, pas critique pour le métier)
    try {
      const wasInsert = await db.dataBreach.findFirst({
        where: { source: args.source, externalId: item.externalId },
        select: { createdAt: true, scrapedAt: true },
      });
      if (
        wasInsert &&
        Math.abs(
          wasInsert.createdAt.getTime() - wasInsert.scrapedAt.getTime(),
        ) < 5_000
      ) {
        inserted++;
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  return { inserted, skipped };
}

/**
 * Orchestration complète : scrape + upsert + retour summary.
 *
 * `deep=true` : parcourt aussi les archives par année (utile pour la 1ère
 * initialisation, ou pour rattraper après une longue indisponibilité).
 * Si aucune fuite n'est encore en BDD, on passe automatiquement en deep.
 */
export async function refreshBreaches(opts: { deep?: boolean } = {}): Promise<{
  totalInserted: number;
  totalSkipped: number;
  perSource: {
    source: string;
    ok: boolean;
    inserted: number;
    skipped: number;
    errors: string[];
  }[];
  durationMs: number;
  deep: boolean;
}> {
  const start = Date.now();

  // Auto-deep si la BDD est vide (1ère init)
  let deep = opts.deep ?? false;
  if (!deep) {
    const total = await db.dataBreach.count();
    if (total === 0) deep = true;
  }

  const results = await scrapeAllSources({ deep });

  const perSource: {
    source: string;
    ok: boolean;
    inserted: number;
    skipped: number;
    errors: string[];
  }[] = [];

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const r of results) {
    if (!r.ok || r.items.length === 0) {
      perSource.push({
        source: r.source,
        ok: false,
        inserted: 0,
        skipped: 0,
        errors: r.errors,
      });
      continue;
    }
    const upsert = await upsertScraped({
      source: r.source as BreachSource,
      items: r.items,
    });
    totalInserted += upsert.inserted;
    totalSkipped += upsert.skipped;
    perSource.push({
      source: r.source,
      ok: true,
      inserted: upsert.inserted,
      skipped: upsert.skipped,
      errors: r.errors,
    });
  }

  return {
    totalInserted,
    totalSkipped,
    perSource,
    durationMs: Date.now() - start,
    deep,
  };
}

/**
 * Lazy refresh trigger : si la BDD n'a pas été rafraîchie depuis > 24h,
 * lance un scrape en arrière-plan (fire-and-forget). Appelé à l'affichage
 * de la page publique : ne bloque jamais le rendu.
 */
export function maybeTriggerLazyRefresh(): void {
  // Async IIFE non-attendue volontairement
  void (async () => {
    try {
      const last = await db.dataBreach.findFirst({
        orderBy: { scrapedAt: "desc" },
        select: { scrapedAt: true },
      });
      const stale =
        !last || Date.now() - last.scrapedAt.getTime() > STALENESS_MS;
      if (!stale) return;

      // Pas de spam : si un autre lazy refresh tourne déjà, on n'en lance
      // pas un autre. Best-effort via Event count.
      const inflightWindow = new Date(Date.now() - 5 * 60 * 1000);
      const inflight = await db.event
        .count({
          where: {
            tenantId: "_system",
            type: "breaches_lazy_refresh_started",
            createdAt: { gte: inflightWindow },
          },
        })
        .catch(() => 0);
      if (inflight > 0) return;

      await refreshBreaches();
    } catch {
      // best-effort, silencieux
    }
  })();
}
