// Route TTS premium : prend un texte, retourne un MP3 synthétisé.
//
// Sécurité :
//  - Auth NextAuth obligatoire (pas d'usage anonyme pour ne pas se faire DDoS)
//  - Plan-gating : Pro+ requis (cf. TTS_MIN_PLAN env, default = pro)
//  - Limite stricte de longueur (5000 chars)
//  - Rate limiting léger via headers (max 50 req/heure par user)
//  - Le contenu envoyé n'est pas loggé (RGPD)
//
// Cache : géré par lib/tts/server-client.ts (hash sha256 → fichier disque)
// donc même MP3 servi instantanément sur reprise / autre user.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getTenantPlan,
  normalizePlan,
  PLAN_RANK,
  type PlanId,
} from "@/lib/plans";
import { isTtsServerEnabled, synthesizeText } from "@/lib/tts/server-client";

export const dynamic = "force-dynamic";

const MIN_PLAN: PlanId = normalizePlan(process.env.TTS_MIN_PLAN ?? "pro");

export async function POST(req: NextRequest) {
  if (!isTtsServerEnabled()) {
    return NextResponse.json({ error: "tts_server_disabled" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const tenantId = session.user!.tenantId as string | undefined;
  if (!tenantId) {
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });
  }

  // Plan-gating
  const plan = await getTenantPlan(tenantId);
  if (PLAN_RANK[plan] < PLAN_RANK[MIN_PLAN]) {
    return NextResponse.json(
      { error: "plan_too_low", required: MIN_PLAN, current: plan },
      { status: 402 },
    );
  }

  // Rate limit léger : 50 req/heure par user via Event count
  const userId = session.user!.id as string;
  const oneHourAgo = new Date(Date.now() - 3600_000);
  const recentCount = await db.event.count({
    where: { userId, type: "tts_synthesize", createdAt: { gte: oneHourAgo } },
  });
  if (recentCount > 50) {
    return NextResponse.json(
      { error: "rate_limited", retry_after_seconds: 3600 },
      { status: 429, headers: { "retry-after": "3600" } },
    );
  }

  // Validation payload
  let body: { text?: string; voice?: string; format?: "mp3" | "wav" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (text.length === 0) {
    return NextResponse.json({ error: "empty_text" }, { status: 400 });
  }
  if (text.length > 5000) {
    return NextResponse.json(
      { error: "text_too_long", max: 5000 },
      { status: 413 },
    );
  }
  const format: "mp3" | "wav" = body.format === "wav" ? "wav" : "mp3";
  const voice =
    typeof body.voice === "string" ? body.voice.slice(0, 80) : undefined;

  // Synthèse (avec cache disque)
  let result: { buffer: Buffer; format: string; cached: boolean };
  try {
    result = await synthesizeText({ text, voice, format });
  } catch (e: any) {
    const code = String(e?.message ?? "tts_failed");
    return NextResponse.json({ error: code }, { status: 502 });
  }

  // Audit log (sans contenu)
  await db.event
    .create({
      data: {
        tenantId,
        userId,
        type: "tts_synthesize",
        payload: {
          textLen: text.length,
          format,
          cached: result.cached,
          voice: voice ?? "default",
        },
      },
    })
    .catch(() => {
      // log best-effort, ne fait pas planter la requête
    });

  return new NextResponse(result.buffer as any, {
    status: 200,
    headers: {
      "content-type": result.format === "wav" ? "audio/wav" : "audio/mpeg",
      "cache-control": "private, max-age=86400",
      "x-tts-cached": result.cached ? "1" : "0",
    },
  });
}
