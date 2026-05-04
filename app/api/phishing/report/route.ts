// Endpoint qui reçoit les signalements de phishing depuis le plugin Outlook.
//
// Auth : pas de NextAuth ici (l'add-in tourne dans Outlook avec une autre
// identité). On AUTHENTIFIE le user via son email professionnel envoyé dans
// le payload. Sécurité : on n'accepte que les users existants en BDD avec
// isActive=true. Si l'email n'est pas reconnu : 403.
//
// CORS : Outlook tourne dans une iframe sandbox sur outlook.office.com, donc
// notre endpoint doit autoriser cet origine. On fait CORS strict permissif
// uniquement sur cette route.
//
// Anti-abuse : rate limit 30 signalements/heure/user. Au-delà = 429.
//
// Side-effects en cas de signalement valide :
//  - Création d'un Event "phishing_external_report" pour le dashboard
//  - +5 coins attribués au user (récompense gamification)
//  - +5 sur le riskScore via refreshUserRiskScore (nouveau bon réflexe)
//  - Webhook 'phishing.reported' (le webhook tenant le verra remonter dans Slack/Teams)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { fireWebhook } from "@/lib/webhooks/dispatcher";
import { refreshUserRiskScore } from "@/lib/risk-score";

export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = [
  "https://outlook.office.com",
  "https://outlook.office365.com",
  "https://outlook.live.com",
];

const PayloadSchema = z.object({
  userEmail: z.string().email(),
  from: z.string().email().nullable().optional(),
  fromDisplayName: z.string().max(200).nullable().optional(),
  subject: z.string().max(500),
  receivedAt: z.string().nullable().optional(),
  bodyExcerpt: z.string().max(10_000).optional(),
  internetMessageId: z.string().max(500).nullable().optional(),
  source: z.string().max(50).optional(),
});

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = ALLOWED_ORIGINS.includes(origin ?? "") ? origin! : "https://outlook.office.com";
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "3600",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req.headers.get("origin"));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: cors });
  }
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.issues[0]?.message },
      { status: 400, headers: cors },
    );
  }
  const data = parsed.data;

  // Authn par email pro : l'user doit exister + être actif
  const user = await db.user.findUnique({
    where: { email: data.userEmail.toLowerCase() },
    select: { id: true, tenantId: true, isActive: true, name: true },
  });
  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: "user_not_authorized" },
      { status: 403, headers: cors },
    );
  }

  // Rate limit : 30 signalements/heure/user
  const oneHourAgo = new Date(Date.now() - 3600_000);
  const recentCount = await db.event.count({
    where: {
      userId: user.id,
      type: "phishing_external_report",
      createdAt: { gte: oneHourAgo },
    },
  });
  if (recentCount >= 30) {
    return NextResponse.json(
      { error: "rate_limited", retry_after_seconds: 3600 },
      { status: 429, headers: { ...cors, "retry-after": "3600" } },
    );
  }

  // Side-effects : Event + coins + riskScore + webhook
  const COINS_AWARDED = 5;

  await db.$transaction(async (tx) => {
    await tx.event.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        type: "phishing_external_report",
        payload: {
          from: data.from ?? null,
          fromDisplayName: data.fromDisplayName ?? null,
          subject: data.subject.slice(0, 200),
          receivedAt: data.receivedAt ?? null,
          internetMessageId: data.internetMessageId ?? null,
          bodyExcerptLen: (data.bodyExcerpt ?? "").length,
          source: data.source ?? "outlook-addin",
        },
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { coins: { increment: COINS_AWARDED } },
    });
  });

  // Refresh riskScore + webhook : non-bloquant
  refreshUserRiskScore(user.id).catch(() => {});
  void fireWebhook(user.tenantId, "phishing.reported", {
    userName: user.name ?? data.userEmail,
    fromAddress: data.from ?? "",
    subject: data.subject,
    source: data.source ?? "outlook-addin",
  }).catch(() => {});

  return NextResponse.json(
    {
      ok: true,
      coinsAwarded: COINS_AWARDED,
      message: "Merci ! Votre signalement a été enregistré.",
    },
    { headers: cors },
  );
}
