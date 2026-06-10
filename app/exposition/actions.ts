// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";
//
// Server action : sauvegarde OPT-IN du plan de remédiation.
//
// Le chemin gratuit anonyme ne crée JAMAIS de ligne. Cette action n'est
// appelable que par un utilisateur CONNECTÉ (tier community) qui a
// explicitement choisi de sauvegarder son plan. C'est le seul moment où une
// donnée personnelle d'exposition est persistée, sur consentement actif.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type SavePlanResult =
  | { ok: true }
  | { ok: false; error: "not_authenticated" | "invalid_input" | "db_error" };

type PlanItemInput = { key: string; label: string; done: boolean; sourceUrl: string };

export async function saveRemediationPlan(
  items: PlanItemInput[],
  initialScore: number,
): Promise<SavePlanResult> {
  const session = await auth();
  if (!session?.user?.id) {
    // Pas connecté : on ne persiste rien. L'UI invitera à créer un compte.
    return { ok: false, error: "not_authenticated" };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "invalid_input" };
  }

  // Sanitization : on ne garde que des champs non sensibles (clés + labels +
  // statut + source). AUCUNE donnée de fuite (pas d'email, pas de mdp).
  const safeItems = items.slice(0, 30).map((i) => ({
    key: String(i.key ?? "").slice(0, 80),
    label: String(i.label ?? "").slice(0, 300),
    done: !!i.done,
    sourceUrl: String(i.sourceUrl ?? "").slice(0, 500),
  }));

  const score = Number.isFinite(initialScore)
    ? Math.max(0, Math.min(100, Math.round(initialScore)))
    : null;

  try {
    await db.remediationPlan.upsert({
      where: { userId: session.user.id as string },
      update: { items: safeItems },
      create: {
        userId: session.user.id as string,
        items: safeItems,
        initialScore: score,
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "db_error" };
  }
}
