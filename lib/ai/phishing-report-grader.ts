// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helper IA pour grader la qualite d'un signalement phishing Outlook.
//
// CAS D'USAGE (Phase 5d Phishing Engine v2, mai 2026) :
//   Quand un user signale un mail via le plugin Outlook (POST /api/phishing/
//   report), on appelle Mistral en parallele de la sauvegarde pour grader :
//     - isLikelyReal : true si le mail signale est probablement un vrai
//       phishing, false si c'est probablement un faux positif (mail legitime
//       que le user a confondu)
//     - quality : qualite globale du signalement (low / medium / high)
//     - reasoning : 2-3 phrases qui expliquent le verdict (pour l'admin)
//
// IMPACT METIER :
//   - Permet de RECOMPENSER plus les vrais phishing (+10 coins) que les
//     faux positifs (+2 coins). Encourage la qualite plutot que le volume.
//   - Affiche dans l'admin un filtre "vrais phishing" vs "faux positifs"
//     pour aider le RSSI a trier les signaux. Phase 5d ne fait pas cette UI
//     (TODO ulterieur).
//   - Audit trail : le verdict IA est stocke dans le payload Event pour
//     audit ulterieur.
//
// LIMITATIONS :
//   - Mistral n'a pas la realtime feed des campagnes phishing internes ;
//     un mail simule par Humanix peut etre vu comme "vrai phishing" (c'est
//     OK, c'en est un techniquement). On flag NOTE_INTERNAL pour ces cas.
//   - On NE STOCKE PAS le body complet du mail signale (limit 2000 chars
//     envoyes a Mistral) -- protection contre exfiltration accidentelle de
//     donnees sensibles d'autres mails du user.
//
// FALLBACK :
//   Si Mistral down ou pas de cle API, l'endpoint /report continue de
//   fonctionner SANS grading -- on garde le comportement actuel (coins fixes
//   a 5). Le grading est OPT-IN amelioration, pas obligatoire.

import { isAbortError } from "@/lib/errors";

const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";
const MODEL = "ministral-8b-latest";

export type ReportGradeInput = {
  subject: string;
  from: string | null;
  fromDisplayName: string | null;
  /** Extrait du body, tronque cote endpoint a 2000 chars max envoyes a l'IA */
  bodyExcerpt: string | null;
};

export type ReportGrade = {
  quality: "low" | "medium" | "high";
  /** True si le mail signale ressemble a un vrai phishing */
  isLikelyReal: boolean;
  /** Recompense coins suggeree : 2 (faible), 5 (moyen), 10 (eleve) */
  suggestedCoins: number;
  /** Explication courte du verdict pour l'admin */
  reasoning: string;
};

export type ReportGradeResult =
  | { ok: true; grade: ReportGrade }
  | { ok: false; error: string };

const SYSTEM = `Tu es l'analyste phishing de Humanix Academie. Tu evalues
la qualite d'un signalement phishing recu via le plugin Outlook.

Ton job :
  1. Determiner si le mail signale est probablement un VRAI phishing
     (isLikelyReal=true) ou un FAUX POSITIF (mail legitime confondu).
  2. Noter la qualite du signalement : "high" si le user a repere un mail
     vraiment suspect, "low" si c'est un mail legitime, "medium" si
     ambiguous.

CRITERES indicatifs d'un VRAI phishing (NON exhaustifs) :
  - Sender domain lookalike (microsoft-security.com au lieu de microsoft.com)
  - Ton urgent + demande d'action immediate
  - Liens vers domaine different du sender
  - Demande d'identifiants / paiement / virement urgent
  - Faute d'orthographe / mauvaise traduction
  - Pression sociale (autorite, peur, FOMO)

INDICATEURS faux positif :
  - Sender d'un domaine connu et legitime (newsletter, transactionnel)
  - Aucune demande d'action sensible
  - Lien vers le meme domaine que le sender
  - Mail attendu (commande, abonnement, etc.)

REGLES :
- Reponse en JSON STRICT (cf. schema ci-dessous).
- Reasoning en FRANCAIS, 2-3 phrases factuelles.
- Pas de jugement sur l'user qui signale (il a bien fait de douter).
- Si tu n'es pas sur, vote prudent : isLikelyReal=true, quality=medium.

FORMAT JSON :
{
  "quality": "low" | "medium" | "high",
  "isLikelyReal": boolean,
  "suggestedCoins": 2 | 5 | 10,
  "reasoning": "string -- 2 a 3 phrases"
}

Mapping coins :
  - quality=low + isLikelyReal=false (faux positif clair) -> 2
  - quality=medium ou ambiguous -> 5
  - quality=high + isLikelyReal=true (vrai phishing bien repere) -> 10`;

function buildUserPrompt(input: ReportGradeInput): string {
  return [
    `Sujet : ${input.subject.slice(0, 300)}`,
    `Expediteur : ${input.fromDisplayName ?? "(inconnu)"} <${input.from ?? "inconnu"}>`,
    `Extrait du corps (max 2000 chars) :`,
    "---",
    (input.bodyExcerpt ?? "(corps vide)").slice(0, 2000),
    "---",
    ``,
    `Evalue la qualite du signalement en JSON strict.`,
  ].join("\n");
}

export async function gradePhishingReport(
  input: ReportGradeInput,
): Promise<ReportGradeResult> {
  if (process.env.DEMO_MODE === "true") {
    return { ok: true, grade: demoFixture(input) };
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "no_api_key" };
  }

  const controller = new AbortController();
  // Timeout court : on ne veut pas bloquer la reponse Outlook si Mistral
  // est lent. 8s max -- si plus long, on fallback sur coins fixes.
  const timeout = setTimeout(() => controller.abort(), 8_000);

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
          { role: "system", content: SYSTEM },
          { role: "user", content: buildUserPrompt(input) },
        ],
        temperature: 0.3, // peu de creativite, on veut un verdict factuel
        max_tokens: 350,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        error: res.status === 429 ? "rate_limited_upstream" : "upstream_error",
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return { ok: false, error: "empty_response" };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "invalid_json" };
    }

    if (!isValidGrade(parsed)) {
      return { ok: false, error: "schema_mismatch" };
    }
    return { ok: true, grade: parsed };
  } catch (e) {
    if (isAbortError(e)) return { ok: false, error: "timeout" };
    return { ok: false, error: "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}

function isValidGrade(obj: unknown): obj is ReportGrade {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  const validQualities = ["low", "medium", "high"];
  const validCoins = [2, 5, 10];
  return (
    typeof o.quality === "string" &&
    validQualities.includes(o.quality) &&
    typeof o.isLikelyReal === "boolean" &&
    typeof o.suggestedCoins === "number" &&
    validCoins.includes(o.suggestedCoins) &&
    typeof o.reasoning === "string"
  );
}

function demoFixture(input: ReportGradeInput): ReportGrade {
  const subject = input.subject.toLowerCase();
  const isUrgent = /urgent|verifi|expire|action requise|imm[ée]diat/.test(
    subject,
  );
  const fromSuspicious =
    !!input.from && /security|verify|alert|noreply\d/.test(input.from);
  if (isUrgent && fromSuspicious) {
    return {
      quality: "high",
      isLikelyReal: true,
      suggestedCoins: 10,
      reasoning:
        "Sujet contient un signal d'urgence ET expediteur sur un domaine generique suspect. Combo classique de phishing -- bon signalement.",
    };
  }
  if (isUrgent || fromSuspicious) {
    return {
      quality: "medium",
      isLikelyReal: true,
      suggestedCoins: 5,
      reasoning:
        "Le mail presente UN signal suspect (urgence OU expediteur). Pas de certitude mais le doute est legitime.",
    };
  }
  return {
    quality: "low",
    isLikelyReal: false,
    suggestedCoins: 2,
    reasoning:
      "Aucun signal evident de phishing dans le sujet/expediteur. Probablement faux positif -- mais le geste de signaler reste valorisable.",
  };
}
