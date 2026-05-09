// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/ai/recap
//
// Endpoint pour le recap personnalise post-quiz. L'user envoie ses
// reponses (questionIndex + selectedChoiceId), on retrouve les questions
// cote SERVEUR via loadEpisode (source de verite MDX), on identifie les
// ratees, on appelle Mistral pour synthetiser.
//
// SECURITE :
//   - Auth requise (rate limit + cout API)
//   - 30 req/h/user (un peu plus genereux que /explain car le recap est
//     declenche automatiquement a la fin d'un quiz, donc 1 par episode)
//   - Le client ne peut PAS envoyer ses propres "bonne reponse" : la BDD
//     de verite est le MDX cote serveur. Donc un user qui voudrait faire
//     halluciner Mistral ne peut pas.
//   - Persona infere serveur (anti-cheat sur le niveau d'explication)
//   - Pas de PII envoyee a Mistral (le contenu MDX est public)

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { loadEpisode } from "@/lib/episodes";
import { recap, type MissedQuestion } from "@/lib/ai/recap";
import { getUserPersona } from "@/lib/ai/persona";

export const dynamic = "force-dynamic";

const Schema = z.object({
  saisonSlug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "slug invalide"),
  episodeSlug: z
    .string()
    .min(1)
    .max(150)
    .regex(/^[a-z0-9-]+$/, "slug invalide"),
  userAnswers: z
    .array(
      z.object({
        questionIndex: z.number().int().min(0).max(50),
        selectedChoiceId: z.string().min(1).max(20),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;

  const rl = checkRateLimit(`ai_recap:${userId}`, 30, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfter },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_payload" },
      { status: 400 },
    );
  }

  const { saisonSlug, episodeSlug, userAnswers } = parsed.data;

  // Source de verite : le MDX cote serveur. Le client envoie juste les
  // index + choiceId, on retrouve la question complete + bonne reponse.
  const ep = loadEpisode(saisonSlug, episodeSlug);
  if (!ep) {
    return NextResponse.json(
      { ok: false, error: "episode_not_found" },
      { status: 404 },
    );
  }

  const quiz = ep.meta.quiz ?? [];
  if (quiz.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no_quiz" },
      { status: 400 },
    );
  }

  // Identification des questions ratees
  const missed: MissedQuestion[] = [];
  for (const ans of userAnswers) {
    const q = quiz[ans.questionIndex];
    if (!q) continue;
    const correctChoice = q.choices.find((c) => c.correct);
    if (!correctChoice) continue;
    if (correctChoice.id !== ans.selectedChoiceId) {
      const userChoice = q.choices.find((c) => c.id === ans.selectedChoiceId);
      missed.push({
        question: q.question,
        correctAnswer: correctChoice.label,
        userAnswer: userChoice?.label ?? "(reponse non reconnue)",
        explanation: q.explanation,
      });
    }
  }

  const totalQuestions = quiz.length;
  const scorePct = Math.round(
    ((totalQuestions - missed.length) / totalQuestions) * 100,
  );

  // Sans-faute : pas besoin d'appeler Mistral, on renvoie un 200 distinct
  // pour que le client affiche un message court (ou rien).
  if (missed.length === 0) {
    return NextResponse.json({
      ok: true,
      recap: null,
      noMisses: true,
      missedCount: 0,
      totalQuestions,
      scorePct,
    });
  }

  const persona = await getUserPersona(userId);

  const result = await recap({
    episodeTitle: ep.meta.title,
    scorePct,
    totalQuestions,
    missedQuestions: missed,
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
    recap: result.recap,
    persona,
    missedCount: missed.length,
    totalQuestions,
    scorePct,
  });
}

function friendlyErrorMessage(code: string): string {
  switch (code) {
    case "no_api_key":
      return "L'IA n'est pas configurée sur cette instance. Contacte ton admin.";
    case "rate_limited_upstream":
      return "Trop de demandes envers Mistral. Réessaye dans une minute.";
    case "timeout":
      return "Mistral est trop lent. Réessaye dans un moment.";
    case "no_misses":
      return "Sans-faute - rien à recapituler !";
    case "demo_mode":
      return "Mode démo : pas d'appel IA réel.";
    default:
      return "Erreur côté serveur. Réessaye, et préviens l'admin si ça persiste.";
  }
}
