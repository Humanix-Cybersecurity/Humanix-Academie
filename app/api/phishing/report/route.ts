// SPDX-License-Identifier: AGPL-3.0-or-later
// Endpoint qui reçoit les signalements de phishing depuis les add-ins clients
// mail : plugin Outlook (browser, CORS) ET add-on Gmail (Apps Script,
// server-side -> pas de CORS). Le champ `source` distingue l'origine
// ("outlook-addin" | "gmail-addon").
//
// Auth : pas de NextAuth ici (l'add-in tourne dans le client mail avec une
// autre identité). On AUTHENTIFIE le user via son email professionnel envoyé
// dans le payload. Sécurité : on n'accepte que les users existants en BDD avec
// isActive=true. Si l'email n'est pas reconnu : 403.
//
// CORS : Outlook tourne dans une iframe sandbox sur outlook.office.com, donc
// notre endpoint doit autoriser cet origine (CORS strict permissif uniquement
// sur cette route). L'add-on Gmail appelle depuis Apps Script côté serveur :
// pas d'en-tête Origin, le CORS ne s'y applique pas.
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
import { triggerCisoLiveSync } from "@/lib/ciso-assistant/live-mode";
import { refreshUserRiskScore } from "@/lib/risk-score";
import { gradePhishingReport } from "@/lib/ai/phishing-report-grader";

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
  const allow = ALLOWED_ORIGINS.includes(origin ?? "")
    ? origin!
    : "https://outlook.office.com";
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
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400, headers: cors },
    );
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

  // Phase 5d (mai 2026) : grading IA Mistral du signalement.
  // On call Mistral AVANT la transaction pour pouvoir ajuster les coins
  // selon la qualite. Timeout court (8s) cote helper -- si Mistral down,
  // fallback gracieux sur coins fixes a 5 (comportement historique).
  const grade = await gradePhishingReport({
    subject: data.subject,
    from: data.from ?? null,
    fromDisplayName: data.fromDisplayName ?? null,
    bodyExcerpt: data.bodyExcerpt ?? null,
  });
  const COINS_AWARDED = grade.ok ? grade.grade.suggestedCoins : 5;

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
          // Phase 5d : verdict IA pour audit ulterieur (filtres admin,
          // analytics qualite des signalements)
          aiGrade: grade.ok
            ? {
                quality: grade.grade.quality,
                isLikelyReal: grade.grade.isLikelyReal,
                reasoning: grade.grade.reasoning,
              }
            : null,
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

  // Live Mode (v2.0) : trigger une mini-sync CISO Assistant debouncee (5s).
  // Fire-and-forget : ne bloque ni la reponse Outlook ni le webhook.
  triggerCisoLiveSync(user.tenantId, "phishing.reported");

  // Message personalise selon le verdict IA. Si grading echoue, message
  // generique historique.
  let message = "Merci ! Votre signalement a été enregistré.";
  if (grade.ok) {
    if (grade.grade.quality === "high" && grade.grade.isLikelyReal) {
      message = `Excellent signalement ! Mistral confirme : ce mail ressemble bien à un phishing. +${COINS_AWARDED} coins.`;
    } else if (grade.grade.quality === "medium") {
      message = `Bon réflexe de signaler par précaution. +${COINS_AWARDED} coins.`;
    } else {
      message = `Merci ! Le mail semble légitime, mais bien fait de douter. +${COINS_AWARDED} coins.`;
    }
  }

  return NextResponse.json(
    {
      ok: true,
      coinsAwarded: COINS_AWARDED,
      message,
      // Verdict IA expose pour permettre au plugin Outlook d'afficher des
      // details si souhaite (futur : icone vert/orange/gris dans le ribbon)
      aiGrade: grade.ok
        ? {
            quality: grade.grade.quality,
            isLikelyReal: grade.grade.isLikelyReal,
            reasoning: grade.grade.reasoning,
          }
        : null,
    },
    { headers: cors },
  );
}
