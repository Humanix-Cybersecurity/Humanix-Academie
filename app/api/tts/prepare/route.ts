// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/tts/prepare
//
// Variante "lightweight" de /api/tts/synthesize : retourne uniquement
// l'URL du MP3 dans le cache (au lieu de balancer le buffer entier dans
// la response).
//
//   in  : { text, voice?, format? }
//   out : { url: "/api/tts/<hash>", cached: true|false, hash }
//
// USAGE COTE CLIENT
//   const { url } = await fetch("/api/tts/prepare", { ... }).then(r => r.json());
//   audio.src = url;
//   audio.play();   // streaming progressif natif <audio>
//
// AVANTAGE
//   - Cache hit ~99% des cas grace au warmup pre-rendu (npm run tts:build).
//   - Le navigateur fetch directement /api/tts/<hash> qui sert un fichier
//     statique avec Cache-Control: immutable + Range requests support
//     -> playback demarre sous 100ms en local, sans charger le blob complet
//        en RAM cote client.
//   - Si cache miss : on synthetise une fois (Voxtral), on persiste,
//     et la 2eme requete sur le meme texte est instantanee.
//
// SECURITE
//   - Auth NextAuth obligatoire
//   - Plan-gating Pro+ (TTS_MIN_PLAN env, default = pro)
//   - Limite stricte de longueur (5000 chars)
//   - Rate limiting via Event count (50 req/heure/user)
//   - Le contenu n'est PAS logge (RGPD)
//
// COMPAT
//   /api/tts/synthesize reste exposé pour la rétro-compatibilité ; le
//   nouveau client utilise /api/tts/prepare.

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
import { defaultCacheRoot, isCached, segmentHash } from "@/lib/tts/cache";
import { sanitizeForTTS } from "@/lib/tts/sanitize";
import { TTS_MODEL } from "@/lib/tts/mistral";

export const dynamic = "force-dynamic";

const MIN_PLAN: PlanId = normalizePlan(process.env.TTS_MIN_PLAN ?? "pro");
const MAX_TEXT = 5000;

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

  // Rate limit léger via count d'Event
  const userId = session.user!.id as string;
  const oneHourAgo = new Date(Date.now() - 3600_000);
  const recentCount = await db.event.count({
    where: {
      userId,
      type: { in: ["tts_synthesize", "tts_prepare"] },
      createdAt: { gte: oneHourAgo },
    },
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
  const rawText = (body.text ?? "").trim();
  if (rawText.length === 0) {
    return NextResponse.json({ error: "empty_text" }, { status: 400 });
  }
  if (rawText.length > MAX_TEXT) {
    return NextResponse.json(
      { error: "text_too_long", max: MAX_TEXT },
      { status: 413 },
    );
  }
  const voice =
    typeof body.voice === "string" ? body.voice.slice(0, 80) : undefined;

  // === Hash deterministe (sanitize PUIS hash, comme le batch warmup) ===
  // segmentHash sait sanitiser en interne ? Non, la sanitization est faite
  // explicitement avant le hash dans synthesizeVoxtral et dans extractSegments.
  // Idem ici : on sanitise pour aligner avec le hash du cache batch.
  const text = sanitizeForTTS(rawText);
  if (text.length === 0) {
    return NextResponse.json({ error: "empty_text_after_sanitize" }, { status: 400 });
  }
  const hash = segmentHash(text, voice ?? "fr_marie_neutral", TTS_MODEL);

  // === Cache hit -> URL immediate ===
  const cacheRoot = defaultCacheRoot();
  if (isCached(cacheRoot, hash)) {
    return NextResponse.json(
      {
        url: `/api/tts/${hash}`,
        hash,
        cached: true,
      },
      { status: 200 },
    );
  }

  // === Cache miss -> synthese, puis URL ===
  // synthesizeText ecrit dans le cache disque, donc apres ce call,
  // /api/tts/<hash> sert le MP3 directement.
  try {
    await synthesizeText({
      text: rawText, // on passe le brut, le provider re-sanitise (idempotent)
      voice,
      format: "mp3",
    });
  } catch (e: unknown) {
    const code = String((e as Error)?.message ?? "tts_failed");
    console.error(`[tts/prepare] synth failed: ${code} (textLen=${text.length})`);
    return NextResponse.json({ error: code }, { status: 502 });
  }

  // Audit log (sans contenu)
  await db.event
    .create({
      data: {
        tenantId,
        userId,
        type: "tts_prepare",
        payload: {
          textLen: text.length,
          voice: voice ?? "default",
          hash,
          cached: false,
        },
      },
    })
    .catch(() => {
      /* best-effort */
    });

  return NextResponse.json(
    {
      url: `/api/tts/${hash}`,
      hash,
      cached: false,
    },
    { status: 200 },
  );
}
