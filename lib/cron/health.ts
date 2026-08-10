// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Calcul de l'etat de sante des taches planifiees (#749).
//
// La logique de verdict est PURE (computeCronStatus) pour etre testable
// sans BDD ; getCronHealth() se contente de charger les donnees.

import { db } from "@/lib/db";
import { CRON_REGISTRY, type CronDefinition } from "./registry";

export type CronStatus =
  /** Derniere execution reussie et dans les temps. */
  | "ok"
  /** A deja tourne, mais pas depuis trop longtemps. */
  | "late"
  /** Derniere execution en erreur. */
  | "error"
  /** Aucune trace d'execution : jamais planifie, ou ordonnanceur mort. */
  | "never";

/**
 * Tolerance avant de crier au retard. Un cron horaire n'est pas « en
 * panne » parce qu'il a 5 minutes de decalage ; on attend d'avoir rate
 * plusieurs passages. Facteur volontairement large : cette page doit
 * signaler les crons MORTS, pas generer du bruit quotidien.
 */
export const STALE_FACTOR = 2.5;

export type CronHealthRow = CronDefinition & {
  status: CronStatus;
  lastRunAt: Date | null;
  lastDurationMs: number | null;
  lastResult: unknown;
  lastError: string | null;
  /** Heures ecoulees depuis la derniere execution (null si jamais). */
  hoursSinceLastRun: number | null;
  /** Nb d'executions en erreur sur les 7 derniers jours. */
  errorsLast7d: number;
};

/**
 * Verdict pour UN cron. Pur : pas de BDD, pas d'horloge implicite (`now`
 * est injecte) - donc testable de maniere deterministe.
 */
export function computeCronStatus(params: {
  expectedEveryHours: number;
  lastRunAt: Date | null;
  lastStatus: string | null;
  now: Date;
}): { status: CronStatus; hoursSinceLastRun: number | null } {
  const { expectedEveryHours, lastRunAt, lastStatus, now } = params;

  if (!lastRunAt) {
    return { status: "never", hoursSinceLastRun: null };
  }

  const hoursSinceLastRun =
    (now.getTime() - lastRunAt.getTime()) / (3600 * 1000);

  // Une erreur prime sur le retard : meme frais, un cron qui plante est
  // le probleme le plus actionnable.
  if (lastStatus === "error") {
    return { status: "error", hoursSinceLastRun };
  }
  if (hoursSinceLastRun > expectedEveryHours * STALE_FACTOR) {
    return { status: "late", hoursSinceLastRun };
  }
  return { status: "ok", hoursSinceLastRun };
}

/** Ordre d'affichage : ce qui demande une action d'abord. */
const STATUS_RANK: Record<CronStatus, number> = {
  error: 0,
  never: 1,
  late: 2,
  ok: 3,
};

export function sortByUrgency(rows: CronHealthRow[]): CronHealthRow[] {
  return [...rows].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      // A statut egal, le plus critique d'abord.
      (a.criticality === b.criticality
        ? 0
        : a.criticality === "high"
          ? -1
          : 1) ||
      a.label.localeCompare(b.label),
  );
}

export type SystemHealth = {
  crons: CronHealthRow[];
  counts: Record<CronStatus, number>;
  /** Détecteur de panne drip : mails dus mais jamais dépêchés (#733). */
  stuckDripCount: number;
  generatedAt: Date;
};

export async function getCronHealth(now = new Date()): Promise<SystemHealth> {
  // Dernier run par cron. Volume : 11 crons × ~90 j de rétention, la table
  // reste petite - un findMany trié suffit, pas besoin de DISTINCT ON.
  const since7d = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const [runs, errorCounts, stuckDripCount] = await Promise.all([
    db.cronRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 500,
      select: {
        name: true,
        startedAt: true,
        durationMs: true,
        status: true,
        result: true,
        errorMessage: true,
      },
    }),
    db.cronRun.groupBy({
      by: ["name"],
      where: { status: "error", startedAt: { gte: since7d } },
      _count: { _all: true },
    }),
    // Bonus à coût nul demandé par l'issue : un mail drip dû depuis plus
    // d'une heure et jamais dépêché = le cron phishing-drip ne tourne pas.
    db.phishingResult.count({
      where: {
        dripScheduledAt: { lt: new Date(now.getTime() - 3600 * 1000) },
        mailDispatchedAt: null,
      },
    }),
  ]);

  const lastByName = new Map<string, (typeof runs)[number]>();
  for (const r of runs) {
    if (!lastByName.has(r.name)) lastByName.set(r.name, r);
  }
  const errorsByName = new Map(errorCounts.map((e) => [e.name, e._count._all]));

  const crons = sortByUrgency(
    CRON_REGISTRY.map((def) => {
      const last = lastByName.get(def.slug) ?? null;
      const { status, hoursSinceLastRun } = computeCronStatus({
        expectedEveryHours: def.expectedEveryHours,
        lastRunAt: last?.startedAt ?? null,
        lastStatus: last?.status ?? null,
        now,
      });
      return {
        ...def,
        status,
        hoursSinceLastRun,
        lastRunAt: last?.startedAt ?? null,
        lastDurationMs: last?.durationMs ?? null,
        lastResult: last?.result ?? null,
        lastError: last?.errorMessage ?? null,
        errorsLast7d: errorsByName.get(def.slug) ?? 0,
      };
    }),
  );

  const counts: Record<CronStatus, number> = {
    ok: 0,
    late: 0,
    error: 0,
    never: 0,
  };
  for (const c of crons) counts[c.status] += 1;

  return { crons, counts, stuckDripCount, generatedAt: now };
}
