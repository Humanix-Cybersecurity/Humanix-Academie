// SPDX-License-Identifier: AGPL-3.0-or-later
// Server actions du Mode Enqueteur.
//
// SECURITE :
//   - Auth obligatoire (cf. requireSession)
//   - Server-side recompute du score (le client peut tricher dans
//     les dev tools sinon)
//   - Rate limit best-effort (1 submit / 10s / user / scenario pour
//     eviter le bruteforce du scoring)
//   - Audit log RGPD : on trace qui a fait quoi (avec hashed IP)

"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api/require-role";
import { checkRateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import { AuditAction, AuditOutcome } from "@prisma/client";
import { computeScore, type InvestigationResultPayload } from "./types";
import { getInvestigationBySlug } from "./loader";
import { evaluateAndUnlock } from "@/lib/achievements/evaluate";
import { computeCoinsEarned } from "@/lib/levels";

const SubmitSchema = z.object({
  scenarioSlug: z.string().min(1).max(100),
  foundIds: z.array(z.string().min(1).max(100)).max(20),
  distractorIds: z.array(z.string().min(1).max(100)).max(20),
  durationSeconds: z.number().int().min(0).max(3600),
});

export type SubmitResult = {
  ok: boolean;
  score?: number;
  maxScore?: number;
  passed?: boolean;
  error?: string;
  /** XP réellement crédité (0 si l'enquête est échouée ou déjà réussie). */
  xpAwarded?: number;
  /** Coins réellement crédités. */
  coinsAwarded?: number;
  /** Badges débloqués par cette enquête. */
  newlyUnlockedAchievements?: { slug: string; title: string; emoji: string }[];
};

/**
 * Sauve le resultat d'une enquete. Recompute le score cote serveur
 * (defense en profondeur). Retourne le score finalise au client.
 *
 * Erreurs gracieuses : on retourne `{ ok: false, error }` plutot que
 * de throw, pour que le composant Player puisse afficher un message
 * sans crash.
 */
export async function submitInvestigation(
  payload: InvestigationResultPayload,
): Promise<SubmitResult> {
  // 1) Validation
  const parsed = SubmitSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides" };
  }

  // 2) Auth
  const guard = await requireSession();
  if ("response" in guard) {
    return { ok: false, error: "Non authentifié" };
  }
  const { session } = guard;
  const userId = session.user.id;
  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return { ok: false, error: "Tenant manquant dans la session" };
  }

  // 3) Charge l'enquete depuis le filesystem MDX
  const inv = getInvestigationBySlug(parsed.data.scenarioSlug);
  if (!inv) {
    return { ok: false, error: "Enquête introuvable" };
  }

  // 4) Rate limit : 1 submit / 10s / user / scenario
  //    On limite par scenario pour eviter qu'un user spamme le meme
  //    scenario pour optimiser son score sans reflechir.
  const rl = checkRateLimit(`inv:${userId}:${inv.slug}`, 1, 10 * 1000);
  if (!rl.ok) {
    return {
      ok: false,
      error: "Trop rapide. Réessaye dans quelques secondes.",
    };
  }

  // 5) Filtrage : garder uniquement les IDs valides du MDX. Si le
  //    client envoie un ID inventé, on l'ignore (defensive).
  const validRedFlagIds = new Set(inv.redFlags.map((rf) => rf.id));
  const validDistractorIds = new Set(inv.distractors.map((d) => d.id));
  const foundIds = parsed.data.foundIds.filter((id) => validRedFlagIds.has(id));
  const distractorIds = parsed.data.distractorIds.filter((id) =>
    validDistractorIds.has(id),
  );

  // 6) Recompute score cote serveur (anti-cheat)
  const { score, maxScore, passed } = computeScore(inv, {
    foundIds,
    distractorIds,
  });

  // 7) Sauvegarde DB + RECOMPENSES (#732)
  //
  // Avant, cette action ne faisait qu'un create : l'UI promettait
  // « +N XP » et il ne se passait strictement rien. On credite donc
  // desormais XP et coins, au prorata du score.
  //
  // ANTI-FARMING : la recompense n'est accordee que la PREMIERE fois
  // qu'une enquete donnee est reussie. Sans ca, rejouer le meme scenario
  // en boucle serait la facon la plus rapide de monter de niveau.
  // L'enquete reste rejouable, elle ne rapporte simplement plus.
  let xpAwarded = 0;
  let coinsAwarded = 0;
  try {
    const alreadyPassed =
      passed &&
      (await db.investigationResult.findFirst({
        where: { userId, scenarioSlug: inv.slug, passed: true },
        select: { id: true },
      })) !== null;

    if (passed && !alreadyPassed) {
      // Prorata du score : reussir de justesse ne rapporte pas autant
      // qu'un sans-faute.
      const ratio = maxScore > 0 ? score / maxScore : 0;
      xpAwarded = Math.max(1, Math.round(inv.xpReward * ratio));
      coinsAwarded = computeCoinsEarned(xpAwarded, ratio >= 1);
    }

    await db.$transaction(async (tx) => {
      await tx.investigationResult.create({
        data: {
          tenantId,
          userId,
          scenarioSlug: inv.slug,
          scenarioType: inv.investigationType,
          redFlagsFound: foundIds,
          distractorsHit: distractorIds,
          score,
          maxScore,
          durationSeconds: parsed.data.durationSeconds,
          passed,
        },
      });

      if (xpAwarded > 0 || coinsAwarded > 0) {
        // L'XP d'enquete n'est rattachee a aucun episode : elle va dans
        // User.bonusXP, le compteur prevu pour ca (#743). Le niveau se
        // recalcule a l'affichage via computeTotalXP.
        await tx.user.update({
          where: { id: userId },
          data: {
            bonusXP: { increment: xpAwarded },
            coins: { increment: coinsAwarded },
          },
        });
      }
    });
  } catch (err) {
    console.error("submitInvestigation: DB write failed", err);
    return { ok: false, error: "Sauvegarde impossible" };
  }

  // 7bis) Badges detective. Best-effort : une erreur d'evaluation ne doit
  // pas faire echouer une enquete deja enregistree.
  let newlyUnlockedAchievements: {
    slug: string;
    title: string;
    emoji: string;
  }[] = [];
  if (passed) {
    try {
      const evalResult = await evaluateAndUnlock(userId);
      newlyUnlockedAchievements = evalResult.newlyUnlocked;
    } catch {
      // best-effort
    }
  }

  // 8) Audit log (best-effort, ne bloque pas la reponse)
  void auditLog({
    action: AuditAction.INVESTIGATION_COMPLETED,
    outcome: AuditOutcome.SUCCESS,
    actor: {
      userId,
      email: session.user.email,
      role: session.user.role ?? null,
    },
    tenantId,
    message: `Enquête "${inv.slug}" complétée : ${score}/${maxScore} (${passed ? "PASS" : "FAIL"})`,
    metadata: {
      kind: "investigation_result",
      slug: inv.slug,
      type: inv.investigationType,
      score,
      maxScore,
      passed,
      durationSeconds: parsed.data.durationSeconds,
      xpAwarded,
      coinsAwarded,
    },
  });

  return {
    ok: true,
    score,
    maxScore,
    passed,
    xpAwarded,
    coinsAwarded,
    newlyUnlockedAchievements,
  };
}
