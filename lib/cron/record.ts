// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Enregistrement des executions de crons (#749).
//
// Chaque route /api/cron/* enveloppe son travail dans recordCronRun() :
//
//   const result = await recordCronRun("risk-snapshot", () =>
//     recordAllTenantsSnapshot(),
//   );
//
// PRINCIPE NON NEGOCIABLE : la telemetrie ne doit JAMAIS casser le cron
// qu'elle observe. Toute erreur d'ecriture BDD est avalee. En revanche une
// erreur du TRAVAIL est enregistree puis re-levee : le cron doit continuer
// a repondre en erreur a son ordonnanceur (Ofelia/k8s comptent dessus pour
// leur retry).

import { db } from "@/lib/db";

/** Au-dela, une ligne de telemetrie n'a plus d'interet operationnel. */
const CRON_RUN_RETENTION_DAYS = 90;

/**
 * Purge amortie : declenchee au plus une fois par intervalle depuis
 * recordCronRun lui-meme. Meme idiome que lib/rate-limit.ts - pas de cron
 * de plus a planifier pour nettoyer la table qui surveille les crons.
 */
const PRUNE_INTERVAL_MS = 6 * 3600 * 1000; // 6 h
let lastPruneAt = 0;

async function pruneOldRuns(): Promise<void> {
  const cutoff = new Date(
    Date.now() - CRON_RUN_RETENTION_DAYS * 24 * 3600 * 1000,
  );
  await db.cronRun.deleteMany({ where: { startedAt: { lt: cutoff } } });
}

/**
 * Execute `work` en enregistrant l'execution dans CronRun.
 *
 * Retourne exactement ce que `work` retourne (ou propage son erreur), pour
 * pouvoir s'inserer dans les handlers existants sans changer leur reponse.
 */
export async function recordCronRun<T extends Record<string, unknown>>(
  name: string,
  work: () => Promise<T>,
): Promise<T> {
  const startedAt = new Date();
  const t0 = Date.now();

  // Purge opportuniste, avant le travail : si le cron plante, on a quand
  // meme nettoye. Best-effort strict.
  if (Date.now() - lastPruneAt >= PRUNE_INTERVAL_MS) {
    lastPruneAt = Date.now();
    await pruneOldRuns().catch(() => {
      /* la telemetrie ne casse pas le cron */
    });
  }

  try {
    const result = await work();
    await db.cronRun
      .create({
        data: {
          name,
          startedAt,
          finishedAt: new Date(),
          durationMs: Date.now() - t0,
          status: "ok",
          // Les compteurs seulement : `result` peut contenir des tableaux
          // volumineux (details par tenant) qu'on ne veut pas stocker.
          result: summarize(result),
        },
      })
      .catch(() => {
        /* la telemetrie ne casse pas le cron */
      });
    return result;
  } catch (err) {
    await db.cronRun
      .create({
        data: {
          name,
          startedAt,
          finishedAt: new Date(),
          durationMs: Date.now() - t0,
          status: "error",
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      })
      .catch(() => {
        /* idem */
      });
    // On re-leve : l'ordonnanceur doit voir l'echec (retry, alerte).
    throw err;
  }
}

/**
 * Ne conserve que les valeurs scalaires du resultat (compteurs, flags).
 * Les crons retournent parfois `details: [...]` par tenant : utile dans la
 * reponse HTTP, inutile a stocker 90 jours.
 */
export function summarize(
  result: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(result)) {
    if (
      typeof v === "number" ||
      typeof v === "boolean" ||
      typeof v === "string"
    ) {
      out[k] = v;
    } else if (Array.isArray(v)) {
      // On garde la TAILLE plutot que le contenu.
      out[`${k}Count`] = v.length;
    }
  }
  return out;
}
