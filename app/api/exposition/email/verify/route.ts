// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/exposition/email/verify — vérifie l'OTP puis, si OK, renvoie le
// matching d'exposition souverain (domaine/organisation contre l'observatoire).
//
// PRIVACY : éphémère. L'email n'est jamais persisté. Audit = ipHash only
// (jamais la cible). Le résultat n'est jamais stocké côté serveur.

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailOtp } from "@/lib/exposure/email-ownership";
import { matchEmailDomain } from "@/lib/exposure/breach-match";
import { recordExposureMetric } from "@/lib/exposure/metrics";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const Schema = z.object({
  email: z.string().email().max(254),
  otp: z.string().regex(/^\d{6}$/),
});

function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const { email, otp } = parsed.data;

  const verified = await verifyEmailOtp(email, otp);
  if (!verified.ok) {
    return NextResponse.json({ ok: false, error: verified.reason }, { status: 401 });
  }

  // Matching souverain éphémère (aucun write, aucun log de l'email).
  const match = await matchEmailDomain(email);

  // Audit : on trace l'événement, JAMAIS la cible (ipHash interne seulement).
  void auditLog({
    action: "EXPOSURE_EMAIL_VERIFIED",
    outcome: "SUCCESS",
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
    message: "Vérification propriété email pour check exposition (cible non journalisée)",
  });

  // Métrique agrégée non-identifiante.
  const exposed = !!match && match.breaches.length > 0;
  void recordExposureMetric("email_domain", exposed ? "exposed" : "clean");

  return NextResponse.json({
    ok: true,
    result: match
      ? {
          domain: match.domain,
          isPersonalDomain: match.isPersonalDomain,
          breachCount: match.breaches.length,
          sensitiveDataPresent: match.sensitiveDataPresent,
          breaches: match.breaches.map((b) => ({
            title: b.title,
            organization: b.organization,
            incidentDate: b.incidentDate,
            dataTypes: b.dataTypes,
            severity: b.severity,
            sourceUrl: b.sourceUrl,
          })),
        }
      : null,
  });
}
