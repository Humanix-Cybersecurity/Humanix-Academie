// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Posture ReCyF VIVANTE d'un tenant (v2 in-app).
//
// Difference avec le diagnostic public (recyf-scoring, stateless) :
//   - l'auto-evaluation est PERSISTEE (RecyfAssessment) ;
//   - deux objectifs sont AUTO-MESURES depuis les donnees reelles, et donc
//     evoluent tout seuls quand le tenant agit :
//       * objectif 4  (sensibilisation / formation) <- completion des saisons
//       * objectif 15 (exercices, tests)            <- exercices de crise joues
//   - les autres objectifs restent declares par l'admin.
//
// Lectures analytiques -> dbReadOnly. Ecriture du snapshot quotidien -> db.

import { db } from "@/lib/db";
import { dbReadOnly } from "@/lib/db-readonly";
import { RECYF_BY_ID, type RecyfProfil } from "./recyf";
import {
  buildRecyfPlan,
  sanitizeAnswers,
  type RecyfAnswer,
  type RecyfAnswers,
  type RecyfPlan,
} from "./recyf-scoring";

// Les deux objectifs mesures automatiquement.
export const OBJ_FORMATION = "obj-4";
export const OBJ_EXERCICES = "obj-15";
export const MEASURED_OBJECTIFS = [OBJ_FORMATION, OBJ_EXERCICES];

const YEAR_MS = 365 * 24 * 3600 * 1000;

// ---- Conversions PURES (testables) ------------------------------------------

/** Couverture formation (%) -> reponse ReCyF. */
export function coverageToAnswer(pct: number): RecyfAnswer {
  if (pct >= 70) return "oui";
  if (pct >= 30) return "en_partie";
  return "non";
}

/** Exercices de crise -> reponse ReCyF. */
export function exercicesToAnswer(
  endedLast12mo: number,
  anyCount: number,
): RecyfAnswer {
  if (endedLast12mo >= 1) return "oui";
  if (anyCount >= 1) return "en_partie";
  return "non";
}

// ---- Sortie -----------------------------------------------------------------

export type MeasuredSignal = {
  objectifId: string;
  /** Libelle court de la mesure reelle (affiche a cote de l'objectif). */
  label: string;
};

export type TenantRecyf = {
  plan: RecyfPlan;
  profil: RecyfProfil;
  hasAssessment: boolean;
  updatedAt: string | null;
  /** Objectifs auto-mesures + leur metrique reelle. */
  measured: MeasuredSignal[];
  measuredIds: string[];
  activeUsers: number;
  /** Points de tendance (score global par jour), du plus ancien au plus recent. */
  trend: Array<{ day: string; globalScore: number }>;
};

/** Couverture moyenne des saisons de sensibilisation (objectif 4), en %. */
async function formationCoverage(
  tenantId: string,
  activeUsers: number,
): Promise<number> {
  const slugs = RECYF_BY_ID[OBJ_FORMATION]?.saisons ?? [];
  if (activeUsers === 0 || slugs.length === 0) return 0;

  const saisons = await dbReadOnly.saison.findMany({
    where: {
      slug: { in: slugs },
      isPublished: true,
      OR: [{ tenantId: null }, { tenantId }],
    },
    select: {
      id: true,
      slug: true,
      _count: { select: { episodes: { where: { isPublished: true } } } },
    },
  });
  if (saisons.length === 0) return 0;

  const progress = await dbReadOnly.progress.groupBy({
    by: ["saisonId"],
    where: {
      tenantId,
      saisonId: { in: saisons.map((s) => s.id) },
      status: "COMPLETED",
      user: {
        isActive: true,
        role: { in: ["LEARNER", "MANAGER", "ADMIN", "RSSI"] },
      },
    },
    _count: { _all: true },
  });
  const completedBySaison = Object.fromEntries(
    progress.map((p) => [p.saisonId, p._count._all]),
  );

  let total = 0;
  for (const s of saisons) {
    const denom = s._count.episodes * activeUsers;
    const completion =
      denom === 0
        ? 0
        : Math.min(
            100,
            Math.round(((completedBySaison[s.id] ?? 0) / denom) * 100),
          );
    total += completion;
  }
  return Math.round(total / saisons.length);
}

/**
 * Calcule la posture ReCyF vivante d'un tenant. Si `recordSnapshot`, enregistre
 * le point de tendance du jour (idempotent : un point par jour).
 */
export async function computeTenantRecyf(
  tenantId: string,
  opts: { recordSnapshot?: boolean } = {},
): Promise<TenantRecyf> {
  const assessment = await dbReadOnly.recyfAssessment.findUnique({
    where: { tenantId },
  });
  const profil: RecyfProfil = assessment?.profil === "EE" ? "EE" : "EI";
  const declared = sanitizeAnswers((assessment?.answers ?? {}) as RecyfAnswers);

  const activeUsers = await dbReadOnly.user.count({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["LEARNER", "MANAGER", "ADMIN", "RSSI"] },
    },
  });

  // Objectif 4 : couverture formation
  const coveragePct = await formationCoverage(tenantId, activeUsers);

  // Objectif 15 : exercices de crise
  const since = new Date(Date.now() - YEAR_MS);
  const [endedLast12mo, anyExercises, lastEnded] = await Promise.all([
    dbReadOnly.crisisExercise.count({
      where: { tenantId, status: "ENDED", endedAt: { gte: since } },
    }),
    dbReadOnly.crisisExercise.count({ where: { tenantId } }),
    dbReadOnly.crisisExercise.findFirst({
      where: { tenantId, status: "ENDED" },
      orderBy: { endedAt: "desc" },
      select: { endedAt: true },
    }),
  ]);

  // Les mesures ecrasent les reponses declarees pour ces 2 objectifs.
  const answers: RecyfAnswers = {
    ...declared,
    [OBJ_FORMATION]: coverageToAnswer(coveragePct),
    [OBJ_EXERCICES]: exercicesToAnswer(endedLast12mo, anyExercises),
  };

  const plan = buildRecyfPlan(answers, profil);

  // Snapshot du jour (tendance)
  const today = new Date().toISOString().slice(0, 10);
  if (opts.recordSnapshot) {
    await db.recyfSnapshot
      .upsert({
        where: { tenantId_day: { tenantId, day: today } },
        create: { tenantId, day: today, globalScore: plan.globalScore },
        update: { globalScore: plan.globalScore },
      })
      .catch(() => {
        /* best-effort : ne bloque pas l'affichage */
      });
  }

  const snapshots = await dbReadOnly.recyfSnapshot.findMany({
    where: { tenantId },
    orderBy: { day: "asc" },
    take: 30,
    select: { day: true, globalScore: true },
  });

  const lastEndedStr =
    lastEnded?.endedAt != null
      ? new Intl.DateTimeFormat("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(lastEnded.endedAt)
      : null;

  const measured: MeasuredSignal[] = [
    {
      objectifId: OBJ_FORMATION,
      label: `${coveragePct}% de couverture des parcours de sensibilisation`,
    },
    {
      objectifId: OBJ_EXERCICES,
      label:
        anyExercises === 0
          ? "Aucun exercice de crise réalisé"
          : `${endedLast12mo} exercice(s) sur 12 mois${
              lastEndedStr ? `, dernier le ${lastEndedStr}` : ""
            }`,
    },
  ];

  return {
    plan,
    profil,
    hasAssessment: assessment != null,
    updatedAt: assessment?.updatedAt.toISOString() ?? null,
    measured,
    measuredIds: MEASURED_OBJECTIFS,
    activeUsers,
    trend: snapshots,
  };
}
