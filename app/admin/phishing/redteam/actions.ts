// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";
//
// Server actions de /admin/phishing/redteam.
// Genere un scenario de phishing via Mistral. Aucune persistence -- le
// scenario est juste renvoye au client pour preview + edit avant lancement.

import { auth } from "@/lib/auth";
import { getTenantPlan, planHasFeature } from "@/lib/plans";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateRedTeamScenario,
  type RedTeamInput,
  type RedTeamResult,
} from "@/lib/ai/phishing-redteam";

export async function generateRedTeamAction(
  formData: FormData,
): Promise<RedTeamResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "unauthorized" };
  }
  // SECURITE : une server action est invocable en POST direct, le layout
  // /admin ne la protege PAS. On exige donc role + plan ici (comme les
  // generateurs IA voisins), sinon n'importe quel compte authentifie (meme
  // LEARNER d'un tenant gratuit) consomme le quota Mistral et la surface de
  // prompt-injection.
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "MANAGER" && role !== "SUPERADMIN") {
    return { ok: false, error: "forbidden" };
  }
  const tenantId = session.user.tenantId as string;
  const plan = await getTenantPlan(tenantId);
  if (!planHasFeature(plan, "phishing_ia", session?.user?.role)) {
    return { ok: false, error: "plan_too_low" };
  }
  // Rate limit : 20 generations/heure/user (anti-abus quota IA).
  const rl = checkRateLimit(`redteam:${session.user.id}`, 20, 60 * 60 * 1000);
  if (!rl.ok) {
    return { ok: false, error: "rate_limited" };
  }

  const sector = String(formData.get("sector") ?? "").trim().slice(0, 200);
  const attackContext = String(formData.get("attackContext") ?? "")
    .trim()
    .slice(0, 1000);
  const targetAudience = String(formData.get("targetAudience") ?? "")
    .trim()
    .slice(0, 200);
  const difficulty = String(formData.get("difficulty") ?? "medium") as
    | "subtle"
    | "medium"
    | "brutal";

  if (!sector || !attackContext || !targetAudience) {
    return { ok: false, error: "missing_fields" };
  }

  const input: RedTeamInput = {
    sector,
    attackContext,
    targetAudience,
    difficulty,
  };

  return await generateRedTeamScenario(input);
}
