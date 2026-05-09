// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helper IA pour le recap personnalise post-quiz.
//
// CAS D'USAGE :
//   L'user vient de finir un quiz d'episode. Plutot qu'un score brut, on
//   genere une synthese pedagogique qui :
//     1. Reconnait ce qui a ete rate (sans culpabiliser)
//     2. Explique le bon raisonnement (pas juste "la bonne reponse etait X")
//     3. Termine par une action concrete a appliquer demain au boulot
//
//   La synthese est adaptee au persona :
//     - beginner : analogies, vocabulaire simple
//     - finance  : virement, fraude au president, RIB
//     - developer: OWASP, supply chain, code
//     - etc.
//
// SECURITE :
//   - Source de verite des questions = MDX cote serveur (le client ne peut
//     pas envoyer une fausse "bonne reponse" pour faire halluciner Mistral)
//   - Pas de PII dans le prompt (les questions/reponses sont du contenu
//     pedagogique public)
//   - max_tokens 500 (~ 300 mots, suffisant pour 4-6 phrases + mini-liste)
//   - Timeout 15s
//
// MODELE : ministral-8b-latest (meme que /explain, coherence couts/latence)

import { isAbortError } from "@/lib/errors";
import { type Persona, PERSONA_BRIEFS } from "./persona";

const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";
const MODEL = "ministral-8b-latest";

export type MissedQuestion = {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  /** Explication officielle MDX, si presente (aide Hex a ne pas inventer). */
  explanation?: string;
};

export type RecapRequest = {
  episodeTitle: string;
  /** Score % (0-100) deja calcule par le caller */
  scorePct: number;
  totalQuestions: number;
  /** Deja filtree : que les questions ratees */
  missedQuestions: MissedQuestion[];
  persona: Persona;
};

export type RecapResult =
  | { ok: true; recap: string; tokensUsed?: number }
  | { ok: false; error: RecapError; details?: string };

export type RecapError =
  | "no_api_key"
  | "rate_limited_upstream"
  | "upstream_error"
  | "timeout"
  | "no_misses"
  | "demo_mode";

const SYSTEM_BASE = `Tu es Hex, le compagnon pedagogique de Humanix Academie.
L'utilisateur vient de terminer un quiz et a fait quelques erreurs. Ton role
est de l'aider a comprendre ce qui lui manquait, sans le decourager.

REGLES STRICTES :
- Reponse en FRANCAIS uniquement.
- Format : 4 a 6 phrases courtes au total. Tu peux utiliser UNE seule
  liste a puces (max 3 items) si vraiment pertinent pour les "points cles".
  Pas de titres "##" / "**".
- Commence par une phrase chaleureuse mais factuelle (pas de "bravo!" s'il
  a rate plusieurs questions). Adapte le ton au nombre d'erreurs.
- Synthetise les concepts derriere les erreurs : explique le bon
  raisonnement, pas juste "la bonne reponse etait X".
- Termine TOUJOURS par une action concrete a appliquer demain au boulot
  ("La prochaine fois que tu vois X, fais Y").
- Ne jamais inventer de fait technique. Si tu doutes, reste general.
- Ne JAMAIS demander d'informations personnelles a l'user.`;

function buildPrompt(req: RecapRequest): {
  system: string;
  user: string;
} {
  const personaBrief = PERSONA_BRIEFS[req.persona];
  const system = `${SYSTEM_BASE}

PERSONA UTILISATEUR : ${personaBrief}`;

  // On limite a 5 ratees pour borner les tokens. Au-dela, on aurait de
  // toute facon une synthese trop generique.
  const misses = req.missedQuestions.slice(0, 5);

  const missesBlock = misses
    .map((m, i) => {
      const lines = [
        `${i + 1}. Question : ${m.question.slice(0, 250)}`,
        `   Bonne reponse : ${m.correctAnswer.slice(0, 200)}`,
        `   Reponse de l'user : ${m.userAnswer.slice(0, 200)}`,
      ];
      if (m.explanation) {
        lines.push(
          `   Explication officielle : ${m.explanation.slice(0, 300)}`,
        );
      }
      return lines.join("\n");
    })
    .join("\n\n");

  const correctCount = req.totalQuestions - req.missedQuestions.length;
  const user = `Episode : ${req.episodeTitle.slice(0, 200)}
Score : ${req.scorePct}% (${correctCount}/${req.totalQuestions} bonnes reponses)

Questions ratees :
${missesBlock}

Synthetise pour cet utilisateur : qu'est-ce qu'il faut qu'il retienne en
priorite, et quelle action concrete il peut appliquer des demain ?`;

  return { system, user };
}

export async function recap(req: RecapRequest): Promise<RecapResult> {
  if (req.missedQuestions.length === 0) {
    return { ok: false, error: "no_misses" };
  }

  if (process.env.DEMO_MODE === "true") {
    return { ok: true, recap: demoFixture(req) };
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "no_api_key" };
  }

  const { system, user } = buildPrompt(req);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(MISTRAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.6,
        max_tokens: 500, // ~300 mots, suffisant pour 4-6 phrases + mini-liste
        top_p: 0.9,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 429) {
      return { ok: false, error: "rate_limited_upstream" };
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return {
        ok: false,
        error: "upstream_error",
        details: `HTTP ${res.status} : ${txt.slice(0, 300)}`,
      };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const text = (data.choices?.[0]?.message?.content ?? "").trim();
    if (!text) {
      return {
        ok: false,
        error: "upstream_error",
        details: "Reponse vide du modele",
      };
    }
    return {
      ok: true,
      recap: text,
      tokensUsed: data.usage?.total_tokens,
    };
  } catch (e) {
    clearTimeout(timeout);
    if (isAbortError(e)) {
      return { ok: false, error: "timeout" };
    }
    return {
      ok: false,
      error: "upstream_error",
      details: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Fixture pour le mode demo : on simule la synthese sans appeler Mistral
 * (zero token brule, zero latence reseau, zero dependance API). Suffit
 * pour montrer l'UX a un prospect en mode demo.
 */
function demoFixture(req: RecapRequest): string {
  const personaIntro: Record<Persona, string> = {
    beginner:
      "Pas de panique, les erreurs c'est normal au debut, c'est meme le but du quiz.",
    technical:
      "Voici ce qui a coince. La cyber est un domaine ou les details comptent enormement.",
    manager:
      "Quelques points cles a clarifier avant de remonter le sujet a ton equipe.",
    developer:
      "Quelques notions techniques a affermir pour ton flow dev quotidien.",
    finance:
      "Voici les points qui peuvent te servir au quotidien en finance / comptabilite.",
    hr: "Quelques zones d'attention pour la dimension RH du sujet.",
    ops: "Quelques rappels qui peuvent eviter une mauvaise nuit en astreinte.",
  };
  const personaAction: Record<Persona, string> = {
    beginner:
      "La prochaine fois que tu doutes, prends 30 secondes avant d'agir et demande a un collegue.",
    technical:
      "La prochaine fois, ouvre les en-tetes complets ou les logs avant toute action sur un alert.",
    manager:
      "La prochaine fois qu'une demande sensible arrive, exige systematiquement une double validation hors-canal.",
    developer:
      "La prochaine fois que tu touches a une dependance externe, lance un audit de chaine d'approvisionnement avant merge.",
    finance:
      "La prochaine fois qu'un RIB change, applique TOUJOURS la procedure d'appel sortant au numero connu.",
    hr: "La prochaine fois qu'on te demande des donnees personnelles employes par mail, exige un canal officiel valide.",
    ops: "La prochaine fois qu'un canal alertesignale un incident, declenche le canal helpdesk dedie sans attendre de voir si c'est grave.",
  };
  const intro = personaIntro[req.persona];
  const action = personaAction[req.persona];
  const firstMiss = req.missedQuestions[0];

  return `${intro}

Tu as rate ${req.missedQuestions.length} question${req.missedQuestions.length > 1 ? "s" : ""} sur ${req.totalQuestions}, principalement autour de : "${firstMiss.question.slice(0, 120)}". La bonne reponse etait : ${firstMiss.correctAnswer.slice(0, 150)}.

Le bon reflexe a retenir : dans le doute, on prefere TOUJOURS verifier hors-canal (telephone direct, message a un collegue de confiance) avant d'agir. C'est un peu plus lent, mais c'est ce qui fait la difference entre une frayeur et un incident reel.

${action}`;
}
