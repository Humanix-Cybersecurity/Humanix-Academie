// SPDX-License-Identifier: AGPL-3.0-or-later
// Calcul du score de risque humain par utilisateur.
// Echelle 0-100 : 100 = excellent (faible risque cyber), 0 = catastrophe.
// Recompute possible a la volee, OU mis en cache sur User.riskScore via update().
import { db } from "@/lib/db";

export type RiskFactors = {
  baseline: number;
  // Bonus (+) ou malus (-) avec leur explication
  components: {
    label: string;
    delta: number;
    weight: "high" | "medium" | "low";
  }[];
  finalScore: number;
  verdict: "excellent" | "bon" | "a_surveiller" | "a_risque";
};

const VERDICT_THRESHOLDS = { excellent: 80, bon: 60, a_surveiller: 40 };

export async function computeRiskScore(userId: string): Promise<RiskFactors> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      progress: {
        where: { status: "COMPLETED" },
        select: {
          score: true,
          bestQuizScorePct: true,
          completedAt: true,
          episodeId: true,
          saisonId: true,
        },
      },
      phishingResults: {
        select: { status: true, sentAt: true },
        orderBy: { sentAt: "desc" },
        take: 10,
      },
      tenant: {
        select: {
          saisonConfigs: {
            where: { isMandatory: true },
            select: { saisonId: true },
          },
        },
      },
    },
  });
  if (!user) throw new Error("user_not_found");

  const components: RiskFactors["components"] = [];
  let score = 50; // baseline neutre

  // 1. Modules complétés -> +1 par épisode complété, plafond +25
  const completed = user.progress.length;
  const completionBonus = Math.min(25, completed * 2);
  if (completionBonus > 0) {
    components.push({
      label: `${completed} épisodes complétés`,
      delta: completionBonus,
      weight: "medium",
    });
    score += completionBonus;
  }

  // 2. Score moyen quiz : >75 = +10, 50-75 = 0, <50 = -10
  // On utilise bestQuizScorePct (vrai pourcentage 0-100) et NON Progress.score
  // qui est de l'XP brute (xpReward + bonus). Cf. T.1 dans ROADMAP_PRODUIT.md.
  if (user.progress.length > 0) {
    const avgQuizPct =
      user.progress.reduce((s, p) => s + (p.bestQuizScorePct ?? 0), 0) /
      user.progress.length;
    if (avgQuizPct >= 75) {
      components.push({
        label: "Score moyen quiz élevé",
        delta: 10,
        weight: "medium",
      });
      score += 10;
    } else if (avgQuizPct < 50) {
      components.push({
        label: "Score moyen quiz faible",
        delta: -15,
        weight: "high",
      });
      score -= 15;
    }
  }

  // 3. Inactivité : pas d'activité depuis 30j+ = -20
  const lastActivity = user.progress
    .map((p) => p.completedAt)
    .filter(Boolean)
    .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as
    | Date
    | undefined;
  if (lastActivity) {
    const daysSince = Math.floor(
      (Date.now() - lastActivity.getTime()) / (24 * 3600 * 1000),
    );
    if (daysSince > 60) {
      components.push({
        label: `Inactivité ${daysSince} jours`,
        delta: -25,
        weight: "high",
      });
      score -= 25;
    } else if (daysSince > 30) {
      components.push({
        label: `Inactivité ${daysSince} jours`,
        delta: -10,
        weight: "medium",
      });
      score -= 10;
    }
  } else if (user.progress.length === 0) {
    components.push({
      label: "Aucune progression",
      delta: -20,
      weight: "high",
    });
    score -= 20;
  }

  // 4. Modules obligatoires non complétés
  const mandatorySaisonIds = new Set(
    user.tenant.saisonConfigs.map((c) => c.saisonId),
  );
  if (mandatorySaisonIds.size > 0) {
    const completedSaisonIds = new Set(user.progress.map((p) => p.saisonId));
    const missingMandatory = [...mandatorySaisonIds].filter(
      (id) => !completedSaisonIds.has(id),
    ).length;
    if (missingMandatory > 0) {
      components.push({
        label: `${missingMandatory} module(s) obligatoire(s) non terminé(s)`,
        delta: -15 * missingMandatory,
        weight: "high",
      });
      score -= 15 * missingMandatory;
    }
  }

  // 5. Phishing tests : signalé = +5/test, cliqué = -10/test, ignoré = neutre
  const phishingClicked = user.phishingResults.filter(
    (r) => r.status === "CLICKED",
  ).length;
  const phishingReported = user.phishingResults.filter(
    (r) => r.status === "REPORTED",
  ).length;
  if (phishingClicked > 0) {
    const malus = -10 * phishingClicked;
    components.push({
      label: `${phishingClicked} clic(s) phishing simulé`,
      delta: malus,
      weight: "high",
    });
    score += malus;
  }
  if (phishingReported > 0) {
    const bonus = 5 * phishingReported;
    components.push({
      label: `${phishingReported} signalement(s) phishing`,
      delta: bonus,
      weight: "medium",
    });
    score += bonus;
  }

  // 6. Niveau atteint : Niveau 4-5 = +5
  if (user.level >= 4) {
    components.push({
      label: `Niveau ${user.level} atteint`,
      delta: 5,
      weight: "low",
    });
    score += 5;
  }

  // Borne 0-100
  const finalScore = Math.max(0, Math.min(100, score));

  let verdict: RiskFactors["verdict"];
  if (finalScore >= VERDICT_THRESHOLDS.excellent) verdict = "excellent";
  else if (finalScore >= VERDICT_THRESHOLDS.bon) verdict = "bon";
  else if (finalScore >= VERDICT_THRESHOLDS.a_surveiller)
    verdict = "a_surveiller";
  else verdict = "a_risque";

  return { baseline: 50, components, finalScore, verdict };
}

/**
 * Recalcule et met a jour le score cache sur User.riskScore.
 * Appele apres chaque action significative (completion episode, phishing click, etc.)
 */
export async function refreshUserRiskScore(userId: string): Promise<number> {
  const r = await computeRiskScore(userId);
  await db.user.update({
    where: { id: userId },
    data: { riskScore: r.finalScore },
  });
  return r.finalScore;
}

export const RISK_VERDICT_LABEL: Record<
  RiskFactors["verdict"],
  { label: string; color: string }
> = {
  excellent: { label: "Excellent", color: "text-success" },
  bon: { label: "Bon", color: "text-accent-500" },
  a_surveiller: { label: "À surveiller", color: "text-amber-600" },
  a_risque: { label: "Vulnérable", color: "text-warn" },
};
