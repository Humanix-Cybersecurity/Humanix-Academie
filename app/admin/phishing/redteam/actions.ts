// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";
//
// Server actions de /admin/phishing/redteam.
// Genere un scenario de phishing via Mistral. Aucune persistence -- le
// scenario est juste renvoye au client pour preview + edit avant lancement.

import { auth } from "@/lib/auth";
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
