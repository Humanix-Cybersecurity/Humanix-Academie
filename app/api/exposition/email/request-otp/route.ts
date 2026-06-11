// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/exposition/email/request-otp — envoie un OTP de vérification de
// propriété d'email (anti-doxxing, contrainte #1). STATELESS, zéro PII en BDD.

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { requestEmailOtp } from "@/lib/exposure/email-ownership";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const Schema = z.object({ email: z.string().email().max(254) });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  // ANTI-ABUS : cet endpoint anonyme declenche un VRAI envoi d'email. Sans
  // garde, il sert d'outil d'email bombing vers des adresses arbitraires (et
  // brule le quota/reputation d'envoi). Double frein : par IP et par email
  // (hashe pour rester zero-PII). Reponse 429 identique dans tous les cas.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const emailKey = createHash("sha256")
    .update(parsed.data.email.toLowerCase())
    .digest("hex")
    .slice(0, 32);
  const ipRl = checkRateLimit(`exposure-otp-ip:${ip}`, 10, 60 * 60 * 1000);
  const emailRl = checkRateLimit(`exposure-otp-mail:${emailKey}`, 3, 60 * 60 * 1000);
  if (!ipRl.ok || !emailRl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }

  const result = await requestEmailOtp(parsed.data.email);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }
  // On ne révèle jamais si l'email "existe" : réponse identique dans tous les
  // cas valides (anti-énumération).
  return NextResponse.json({ ok: true });
}
