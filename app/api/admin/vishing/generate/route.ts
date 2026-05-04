// Endpoint admin : genere un script de vishing simule via Mistral souverain.
//
// Securite :
//  - Auth NextAuth obligatoire
//  - Role ADMIN/MANAGER/SUPERADMIN requis
//  - Plan-gating : feature "phishing_ia" (Pro+) — meme regle que phishing IA
//  - Rate limit : 20 req/heure par tenant (in-memory, sans Redis pour MVP)
//  - Anti-PII : delegue au generateur (lib/vishing/script-generator.ts)
//  - Aucun stockage : le script genere est retourne au client, pas persiste

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantPlan, planHasFeature } from "@/lib/plans";
import {
  generateVishingScript,
  type VishingArgs,
} from "@/lib/vishing/script-generator";

export const dynamic = "force-dynamic";

// Rate limit naif in-memory : suffisant pour un MVP, a migrer sur Redis
// quand on aura plusieurs replicas (ce script tournera sur un seul process
// node pour le launch OSS).
const RATE_LIMIT_PER_HOUR = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(tenantId: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(tenantId);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(tenantId, { count: 1, resetAt: now + 3_600_000 });
    return { ok: true };
  }
  if (bucket.count >= RATE_LIMIT_PER_HOUR) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}

const ALLOWED_TEMPLATES = new Set<VishingArgs["template"]>([
  "fake-support-it",
  "fake-banque",
  "fake-direction",
  "fake-fournisseur",
  "fake-cnil",
  "free",
]);
const ALLOWED_DIFFICULTIES = new Set<VishingArgs["difficulty"]>([
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
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user!.tenantId as string;
  if (!tenantId) {
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });
  }

  const plan = await getTenantPlan(tenantId);
  if (!planHasFeature(plan, "phishing_ia")) {
    return NextResponse.json(
      {
        error: "plan_too_low",
        message: "Cette feature requiert le plan Pro ou superieur.",
        feature: "phishing_ia",
      },
      { status: 402 },
    );
  }

  const rl = checkRateLimit(tenantId);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit", retryAfterSeconds: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const args = parseArgs(body);
  if ("error" in args) {
    return NextResponse.json({ error: args.error }, { status: 400 });
  }

  try {
    const script = await generateVishingScript(args);
    return NextResponse.json({ ok: true, script });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    // detectPII renvoie un message "Donnee personnelle..." → 422
    if (msg.startsWith("Donn")) {
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

function parseArgs(
  body: unknown,
): VishingArgs | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "invalid_body" };
  }
  const b = body as Record<string, unknown>;
  if (
    typeof b.template !== "string" ||
    !ALLOWED_TEMPLATES.has(b.template as VishingArgs["template"])
  ) {
    return { error: "invalid_template" };
  }
  if (typeof b.service !== "string" || b.service.length < 1 || b.service.length > 50) {
    return { error: "invalid_service" };
  }
  if (
    typeof b.difficulty !== "string" ||
    !ALLOWED_DIFFICULTIES.has(b.difficulty as VishingArgs["difficulty"])
  ) {
    return { error: "invalid_difficulty" };
  }
  if (b.context !== undefined && b.context !== null) {
    if (typeof b.context !== "string" || b.context.length > 200) {
      return { error: "invalid_context" };
    }
  }
  return {
    template: b.template as VishingArgs["template"],
    service: b.service,
    difficulty: b.difficulty as VishingArgs["difficulty"],
    context: typeof b.context === "string" ? b.context : undefined,
  };
}
