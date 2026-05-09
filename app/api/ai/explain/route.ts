// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/ai/explain
//
// Endpoint pour les explications pedagogiques contextuelles. Adapte la
// reponse au persona de l'user (beginner / technical / manager / etc.).
//
// CAS D'USAGE :
//   - Bouton "Pourquoi ce mail etait suspect ?" sur la landing phishing
//   - Bouton "Que veut dire SPF / DKIM / DMARC ?" dans les episodes
//   - Recap personnalise post-quiz : "voici ce que tu as rate"
//
// SECURITE :
//   - Auth requise (pas d'usage anonyme : couts API + tracage)
//   - Rate limit : 20 req/h/user (suffisant pour usage normal,
//     bloque le abuse)
//   - Pas de PII envoyee dans le prompt (déjà garanti par buildPrompt)
//   - Persona infere automatiquement (l'user ne peut pas se faire passer
//     pour un autre niveau)

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { explain, type ExplainTopic } from "@/lib/ai/explain";
import { getUserPersona } from "@/lib/ai/persona";

export const dynamic = "force-dynamic";

const Schema = z.object({
  topic: z.enum(["phishing_email", "phishing_indicator", "concept", "ioc"]),
  question: z.string().min(3).max(500),
  context: z
    .object({
      templateName: z.string().max(100).optional(),
      redFlags: z.array(z.string().max(300)).max(8).optional(),
      fromDomain: z.string().max(255).optional(),
      extra: z.string().max(500).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;

  // Rate limit : 20 req/h par user (suffisant pour usage normal)
  const rl = checkRateLimit(
    `ai_explain:${userId}`,
    20,
    60 * 60 * 1000,
  );
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        retryAfterSec: rl.retryAfter,
      },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload" },
      { status: 400 },
    );
  }

  // Le persona est infere du user : il ne peut pas être triche cote client
  // (sinon un user pourrait demander des reponses "developer" pour avoir
  // plus de details techniques). Source de verite = BDD + heuristique.
  const persona = await getUserPersona(userId);

  const result = await explain({
    topic: parsed.data.topic as ExplainTopic,
    question: parsed.data.question,
    context: parsed.data.context,
    persona,
  });

  if (!result.ok) {
    const status =
      result.error === "rate_limited_upstream"
        ? 503
        : result.error === "no_api_key"
          ? 503
          : result.error === "timeout"
            ? 504
            : 500;
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        message: friendlyErrorMessage(result.error),
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    explanation: result.explanation,
    persona,
  });
}

function friendlyErrorMessage(code: string): string {
  switch (code) {
    case "no_api_key":
      return "L'IA n'est pas configurée sur cette instance. Contacte ton admin.";
    case "rate_limited_upstream":
      return "Trop de demandes envers Mistral. Réessaye dans une minute.";
    case "timeout":
      return "Mistral est trop lent à répondre. Réessaye dans un moment.";
    case "invalid_question":
      return "Ta question est trop courte. Sois un peu plus précis ?";
    case "demo_mode":
      return "Mode démo : pas d'appel IA réel.";
    default:
      return "Erreur côté serveur. Réessaye, et préviens l'admin si ça persiste.";
  }
}
