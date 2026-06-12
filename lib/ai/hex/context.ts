// SPDX-License-Identifier: AGPL-3.0-or-later
// Construction du contexte enrichi pour Hex (Phase 2 du roadmap IA).
//
// Pourquoi cette couche :
// Le system prompt brut (lib/ai/hex/system-prompt.ts) accepte deja un
// HexChatContext. Cette lib fabrique ce contexte en lisant la DB :
//   - prenom / role / plan (depuis session)
//   - module en cours d'apprentissage (depuis URL client)
//   - 3 derniers episodes consultes (depuis Progress)
//   - score quiz moyen sur les 30 derniers jours (pour adaptation du ton)
//
// Le but : Hex personnalise ses reponses sans demander a l'humain de
// repeter qui il est et ou il en est. C'est le "Hex te connait" qu'on
// promet en marketing.
//
// Pas de PII envoyee au LLM : on extrait juste prenom + slug d'episode.
// Aucun email, aucun nom de famille, aucun ID interne.

import { db } from "@/lib/db";
import type { HexChatContext } from "./system-prompt";
import type { PlanId } from "@/lib/plans";

export type EnrichedContextInput = {
  userId: string;
  tenantId: string | undefined;
  userName: string | null | undefined;
  userRole: HexChatContext["userRole"];
  userPlan: PlanId;
  currentRoute: string | undefined;
  currentModule: string | undefined;
};

/**
 * Construit le contexte Hex enrichi a partir de la session + d'un appel
 * DB optionnel (top 3 dernieres Progress + score moyen).
 *
 * Resilient : si la DB est indisponible, on retourne le contexte
 * minimal (sans recent activity). Le chat reste fonctionnel.
 */
export async function buildEnrichedContext(
  input: EnrichedContextInput,
): Promise<HexChatContext & {
  recentModules?: string[];
  recentAvgQuizPct?: number | null;
  toneHint?: "encouragement" | "challenge" | "neutral";
}> {
  const base: HexChatContext = {
    userFirstName:
      typeof input.userName === "string"
        ? input.userName.split(/\s+/)[0]
        : undefined,
    userRole: input.userRole,
    userPlan: input.userPlan,
    currentRoute: input.currentRoute,
    currentModule: input.currentModule,
  };

  if (!input.tenantId) return base;

  try {
    // Top 5 dernieres Progress avec slug episode pour pointer "tu viens
    // de finir <module>".
    const recent = await db.progress.findMany({
      where: {
        userId: input.userId,
        tenantId: input.tenantId,
        status: { in: ["IN_PROGRESS", "COMPLETED"] },
      },
      include: {
        episode: { select: { slug: true, title: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    const recentModules = recent
      .map((r) => r.episode?.slug)
      .filter((s): s is string => Boolean(s));

    // Moyenne des quiz sur les 30 derniers jours (= signal "le user
    // galere" ou "il maitrise"). Sert a l'adaptation de ton.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentScores = await db.progress.findMany({
      where: {
        userId: input.userId,
        tenantId: input.tenantId,
        status: "COMPLETED",
        updatedAt: { gte: since },
        bestQuizScorePct: { gt: 0 },
      },
      select: { bestQuizScorePct: true },
    });
    let recentAvgQuizPct: number | null = null;
    let toneHint: "encouragement" | "challenge" | "neutral" = "neutral";
    if (recentScores.length > 0) {
      const sum = recentScores.reduce((acc, p) => acc + p.bestQuizScorePct, 0);
      recentAvgQuizPct = Math.round(sum / recentScores.length);
      if (recentAvgQuizPct < 50) toneHint = "encouragement";
      else if (recentAvgQuizPct >= 80) toneHint = "challenge";
    }

    return {
      ...base,
      recentModules,
      recentAvgQuizPct,
      toneHint,
    };
  } catch (err) {
    // DB down ou query echouee : on degrade gracieusement
    console.warn("hex-context: enrichment failed, falling back to minimal", err);
    return base;
  }
}

/**
 * Ajoute le bloc "tone hint" au system prompt si pertinent. Appele apres
 * buildSystemPrompt() - c'est un addendum injectable.
 */
export function buildToneAddendum(
  ctx: Awaited<ReturnType<typeof buildEnrichedContext>>,
): string {
  const lines: string[] = [];

  if (ctx.recentModules && ctx.recentModules.length > 0) {
    lines.push(
      `Modules consultés récemment : ${ctx.recentModules.slice(0, 3).join(", ")}.`,
    );
  }

  if (typeof ctx.recentAvgQuizPct === "number") {
    lines.push(
      `Score quiz moyen sur 30 jours : ${ctx.recentAvgQuizPct} %.`,
    );
  }

  if (ctx.toneHint === "encouragement") {
    lines.push(
      "L'humain est en phase d'apprentissage (score quiz moyen < 50 %). " +
        "Ton : encourageant et patient. Ne dramatise pas les échecs, " +
        "valorise les progrès, propose des modules accessibles.",
    );
  } else if (ctx.toneHint === "challenge") {
    lines.push(
      "L'humain maîtrise bien les fondamentaux (score quiz moyen ≥ 80 %). " +
        "Ton : challenge progressif. Tu peux aller plus en profondeur, " +
        "proposer des scénarios avancés (vishing IA, fraude au président, " +
        "supply chain), ou des modules expert.",
    );
  }

  if (lines.length === 0) return "";
  return "\n\n# État de progression de l'humain\n" + lines.join(" ");
}
