// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helper IA pour generer un debrief personnalise apres clic/submit phishing.
//
// CAS D'USAGE :
//   User clique sur un mail de phishing simule -> landing /phishing/[token].
//   Au lieu du debrief generique base sur les markers hardcoded du template,
//   on appelle Mistral avec :
//     - Le template specifique du mail
//     - Les signaux ratés (markers du template)
//     - L'HISTORIQUE du user : combien de fois clique, sur quels themes,
//       combien de fois signalé, etc.
//     - Le service / role du user (pour adapter le ton)
//   Mistral produit un debrief court (4-6 phrases) PERSONNALISE :
//     - Ton plus dur si recidive (3e clic dans le mois)
//     - Ton plus encourageant si premiere fois et signaux subtils
//     - Reference le pattern observe ("ca fait 2x que tu te fais avoir par
//       des fraudes au president, on va creuser ce reflexe")
//
// SECURITE / RGPD :
//   - On NE TRANSMET PAS l'email exact / nom complet a Mistral
//   - On transmet : prenom (sans nom de famille), service, role generique
//   - On transmet le COUNT d'evenements, pas la liste detaillee
//   - Pas de PII identifiante (email, telephone, ...)
//
// FALLBACK :
//   Si pas de cle API ou Mistral down, on renvoie ok=false. Le caller affiche
//   alors le debrief hardcoded existant (markers du template). Pas de blocage
//   UX.

import { isAbortError } from "@/lib/errors";

const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";
const MODEL = "ministral-8b-latest";

export type DebriefInput = {
  /** Prenom du user (premiere partie du nom, jamais le nom complet) */
  firstName: string;
  /** Service ou role du user, pour adapter le ton (ex: "Compta", "Commercial") */
  serviceOrRole: string;
  /** Nom lisible du template (ex: "Faux Microsoft 365") */
  templateName: string;
  /** Signaux factuels que le template contenait */
  markers: string[];
  /**
   * Historique recent du user (anonymise) :
   *   - clickedCount : total clicks sur les campagnes des 90 derniers jours
   *   - submittedCount : total submissions
   *   - reportedCount : total signalements
   *   - clickedThemes : ex ["microsoft", "fraude-president", "colissimo"]
   *     (themes deduits des templates, pas les valeurs)
   */
  history: {
    clickedCount: number;
    submittedCount: number;
    reportedCount: number;
    clickedThemes: string[];
  };
  /** True si user a soumis le formulaire fake (pas juste clique) */
  hasSubmitted: boolean;
};

export type DebriefResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

const SYSTEM = `Tu es Hex, le compagnon pedagogique de Humanix Academie.
Tu rediges un DEBRIEF PERSONNALISE apres qu'un apprenant a clique (ou pire,
soumis ses credentials) sur une simulation de phishing.

REGLES :
- Reponse en FRANCAIS, 4 a 6 phrases courtes (max 120 mots).
- Pas de titres, pas de liste a puces. Texte au fil de l'eau.
- TUTOIE l'apprenant (on est cosy, pas formel).
- Si recidive (clickedCount >= 3) : ton ferme mais bienveillant, pas
  culpabilisant. "Ca fait X fois, on va comprendre ensemble".
- Si premiere fois + signaux subtils : encourageant, "1 personne sur 3
  clique sur ce type de mail".
- Si pattern thematique (ex: clique 2x sur fraude president) : nomme le
  pattern et propose un focus ("travaillons les fraudes au PDG").
- Si hasSubmitted=true : ton plus serieux, conseil concret immediat
  (changer mdp sur le vrai site, activer 2FA).
- Termine par UNE phrase d'action concrete pour demain.
- NE JAMAIS inventer un fait. Pas d'hallucination de "X% des gens".
- NE JAMAIS demander d'info personnelle.`;

function buildUserPrompt(input: DebriefInput): string {
  const lines: string[] = [];
  lines.push(`Apprenant : ${input.firstName} (service : ${input.serviceOrRole})`);
  lines.push(`Template piege : ${input.templateName}`);
  lines.push(
    `Signaux factuels du mail : ${input.markers
      .slice(0, 6)
      .map((m) => m.slice(0, 200))
      .join(" ; ")}`,
  );
  lines.push(
    `Historique 90 derniers jours : ${input.history.clickedCount} clic(s) sur simulations, ${input.history.submittedCount} soumission(s) de credentials, ${input.history.reportedCount} signalement(s).`,
  );
  if (input.history.clickedThemes.length > 0) {
    lines.push(
      `Themes deja cliques par le passe : ${input.history.clickedThemes.slice(0, 5).join(", ")}.`,
    );
  }
  lines.push(
    input.hasSubmitted
      ? "ACTION : il VIENT DE SOUMETTRE le formulaire fake (cas grave)."
      : "ACTION : il a clique sans soumettre (cas moins grave).",
  );
  return lines.join("\n");
}

export async function generatePhishingDebrief(
  input: DebriefInput,
): Promise<DebriefResult> {
  // Mode demo : fixture deterministe (pas de cout API, pas de reseau)
  if (process.env.DEMO_MODE === "true") {
    return { ok: true, text: demoFixture(input) };
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "no_api_key" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

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
        temperature: 0.7, // un peu de chaleur, mais pas trop creatif
        max_tokens: 350,
        top_p: 0.9,
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
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { ok: false, error: "empty_response" };
    }
    return { ok: true, text };
  } catch (e) {
    if (isAbortError(e)) {
      return { ok: false, error: "timeout" };
    }
    return { ok: false, error: "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}

// Fixture demo deterministe -- montre le bon ton aux visiteurs de la demo.
function demoFixture(input: DebriefInput): string {
  if (input.hasSubmitted) {
    return `${input.firstName}, tu viens de taper tes credentials sur un site qui ressemblait a un vrai mais qui ne l'etait pas. Pas de panique, c'etait un exercice et AUCUNE valeur n'a ete enregistree -- on a juste capte le geste. Mais si ce piege avait ete reel, ton mot de passe serait deja en circulation. Ton reflexe pour demain : verifier l'URL dans la barre d'adresse AVANT de taper quoi que ce soit dans un formulaire de login (l'attaquant copie le visuel, jamais l'URL legitime).`;
  }
  if (input.history.clickedCount >= 3) {
    return `${input.firstName}, ca fait ${input.history.clickedCount} fois ce trimestre que tu te fais piéger -- on va creuser ensemble. Les ${input.templateName.toLowerCase()} jouent sur l'URGENCE et la peur de manquer quelque chose. La prochaine fois, donne-toi 30 secondes avant d'agir : un vrai service legitime ne te met JAMAIS dans l'urgence par mail. Ton focus pour la semaine : signaler le prochain mail suspect plutot que cliquer.`;
  }
  return `${input.firstName}, 1 personne sur 3 clique sur ce type de mail -- t'es loin d'etre seul. Le piege ici, c'etait ${input.markers[0]?.toLowerCase() ?? "un signal subtil"}. La prochaine fois, fais le test des 3 secondes : domaine bizarre + urgence + lien clickable = signalement. C'est ce reflexe qui te protege.`;
}
