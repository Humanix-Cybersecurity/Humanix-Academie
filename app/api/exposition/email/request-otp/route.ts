// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/exposition/email/request-otp — envoie un OTP de vérification de
// propriété d'email (anti-doxxing, contrainte #1). STATELESS, zéro PII en BDD.

import { NextResponse } from "next/server";
import { z } from "zod";
import { requestEmailOtp } from "@/lib/exposure/email-ownership";

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

  const result = await requestEmailOtp(parsed.data.email);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }
  // On ne révèle jamais si l'email "existe" : réponse identique dans tous les
  // cas valides (anti-énumération).
  return NextResponse.json({ ok: true });
}
