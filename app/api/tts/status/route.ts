// SPDX-License-Identifier: AGPL-3.0-or-later
// Endpoint léger pour le sondage côté client : "le TTS premium est-il
// disponible pour moi ?". Pas d'audit log, pas d'appel au service TTS,
// pas de calcul lourd. Juste : auth + plan check.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getTenantPlan,
  normalizePlan,
  PLAN_RANK,
  type PlanId,
} from "@/lib/plans";
import { getProvider, isTtsServerEnabled } from "@/lib/tts/server-client";
import { VOXTRAL_VOICES } from "@/lib/tts/providers/voxtral";

export const dynamic = "force-dynamic";

const MIN_PLAN: PlanId = normalizePlan(process.env.TTS_MIN_PLAN ?? "pro");

export async function GET() {
  if (!isTtsServerEnabled()) {
    return NextResponse.json({ available: false, reason: "service_off" });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ available: false, reason: "unauthenticated" });
  }
  const tenantId = session.user!.tenantId as string | undefined;
  if (!tenantId) {
    return NextResponse.json({ available: false, reason: "no_tenant" });
  }

  const plan = await getTenantPlan(tenantId);
  if (PLAN_RANK[plan] < PLAN_RANK[MIN_PLAN]) {
    return NextResponse.json({
      available: false,
      reason: "plan_too_low",
      required: MIN_PLAN,
      current: plan,
    });
  }

  const provider = getProvider();
  return NextResponse.json({
    available: true,
    plan,
    provider,
    voice: provider === "voxtral" ? "fr_marie_neutral" : "fr_FR-siwis-medium",
    voices: provider === "voxtral" ? VOXTRAL_VOICES : ["fr_FR-siwis-medium"],
  });
}
