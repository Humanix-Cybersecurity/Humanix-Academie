// SPDX-License-Identifier: AGPL-3.0-or-later
// Endpoint admin : genere un SMS de smishing simule via Mistral souverain.
//
// Sécurité :
//  - Auth NextAuth obligatoire
//  - Role ADMIN/MANAGER/RSSI/SUPERADMIN requis
//  - Plan-gating : feature "smishing" (Pro+)
//  - Rate limit : 20 req/heure par tenant
//  - Anti-PII : délégué au generateur
//  - Aucun stockage : le SMS retourne au client, pas persiste
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantPlan, planHasFeature } from "@/lib/plans";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateSmishingScript,
  type SmishingArgs,
} from "@/lib/smishing/script-generator";

export const dynamic = "force-dynamic";

const ALLOWED_TEMPLATES = new Set<SmishingArgs["template"]>([
  "fake-livreur",
  "fake-banque",
  "fake-impots",
  "fake-2fa",
  "fake-president",
]);
const ALLOWED_DIFFICULTIES = new Set<SmishingArgs["difficulty"]>([
  "easy",
  "medium",
  "hard",
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user!.role;
  if (
    role !== "ADMIN" &&
    role !== "MANAGER" &&
    role !== "RSSI" &&
    role !== "SUPERADMIN"
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user!.tenantId as string;
  if (!tenantId) {
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });
  }

  const plan = await getTenantPlan(tenantId);
  if (!planHasFeature(plan, "smishing")) {
    return NextResponse.json(
      {
        error: "plan_too_low",
        message: "Cette feature requiert le plan Pro ou supérieur.",
        feature: "smishing",
      },
      { status: 402 },
    );
  }

  const rl = checkRateLimit(`smishing-gen:${tenantId}`, 20, 3_600_000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Trop de générations dans la dernière heure. Réessayez plus tard.",
        retryAfter: rl.retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const template = String(body?.template ?? "");
  const service = String(body?.service ?? "").slice(0, 50);
  const difficulty = String(body?.difficulty ?? "");
  const context = body?.context
    ? String(body.context).slice(0, 200)
    : undefined;

  if (!ALLOWED_TEMPLATES.has(template as SmishingArgs["template"])) {
    return NextResponse.json({ error: "invalid_template" }, { status: 400 });
  }
  if (!ALLOWED_DIFFICULTIES.has(difficulty as SmishingArgs["difficulty"])) {
    return NextResponse.json({ error: "invalid_difficulty" }, { status: 400 });
  }
  if (!service) {
    return NextResponse.json({ error: "service_required" }, { status: 400 });
  }

  try {
    const script = await generateSmishingScript({
      template: template as SmishingArgs["template"],
      service,
      difficulty: difficulty as SmishingArgs["difficulty"],
      context,
    });
    return NextResponse.json({ script });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "generation_failed";
    // PII / autres erreurs metier : 400 plutot que 500
    if (msg.includes("Donn") || msg.includes("personnelle")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
