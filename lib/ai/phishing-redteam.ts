// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helper IA pour generer un scenario phishing red team complet.
//
// CAS D'USAGE (Phase 5b Phishing Engine v2, mai 2026) :
//   Admin (RSSI, DPO) va sur /admin/phishing/redteam et decrit :
//     - Le secteur de son entreprise (ex: industrie, sante, finance)
//     - Une attaque RECENTE qu'il a vue dans son secteur
//     - Les cibles a tester (service ou role : compta, RH, dirigeants...)
//     - Le ton souhaite (subtil / moyen / brutal)
//   Mistral genere un scenario complet :
//     - Subject de mail credible
//     - Sender simulant un domaine plausible (cousin lookalike)
//     - Corps HTML pixel-perfect du lure
//     - 3-5 "markers" pedagogiques (ce qui aurait du alerter)
//     - Recommandation de cibles (par service / role)
//
// PHILOSOPHIE :
//   On ne SAUVE PAS automatiquement la campagne. L'admin recoit un BROUILLON
//   qu'il valide / edite manuellement avant lancement. Garantit qu'aucun
//   contenu IA ne part chez les apprenants sans review humaine.
//
// SECURITE :
//   - Refuse de generer du contenu phishing visant une vraie cible nommee
//     (anti-spear-phishing reel). Le system prompt force le ton "simulation
//     interne pour formation".
//   - Pas de contenu illegal / malware / instructions exploit
//   - Output sanitize cote /admin avant rendu (DOMPurify)

import { isAbortError } from "@/lib/errors";

const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";
// Pour la generation creative on monte en mistral-small : meilleure qualite
// de prose, mieux respecte les contraintes complexes du prompt.
const MODEL = "mistral-small-latest";

export type RedTeamInput = {
  /** Secteur de l'entreprise (ex: "PME industrie", "cabinet medical") */
  sector: string;
  /** Description de l'attaque vue recemment ou type d'attaque visee */
  attackContext: string;
  /** Service ou role a tester (ex: "Compta", "RH", "tout le monde") */
  targetAudience: string;
  /** Niveau de difficulte du piege */
  difficulty: "subtle" | "medium" | "brutal";
};

export type RedTeamScenario = {
  subject: string;
  fromEmail: string;
  fromName: string;
  bodyHtml: string;
  markers: string[];
  audienceRecommendation: string;
  /** 2-3 phrases qui resument le scenario, pour la fiche admin */
  pedagogicalGoal: string;
};

export type RedTeamResult =
  | { ok: true; scenario: RedTeamScenario }
  | { ok: false; error: string };

const SYSTEM = `Tu es l'assistant red team de Humanix Academie.
Tu generes des scenarios de PHISHING SIMULE pour la formation interne d'une
entreprise. Tu n'es PAS un outil offensif -- ces scenarios sont envoyes aux
PROPRES SALARIES de l'entreprise dans le cadre legal d'un test de
sensibilisation cyber.

REGLES STRICTES :
- Reponse en FRANCAIS uniquement (langue cible des apprenants).
- TOUJOURS au format JSON STRICT (cf. schema dans le prompt user).
- Le bodyHtml doit etre du HTML simple inline (table, p, a, strong) -- pas
  de script, pas de iframe, pas de style@import. Compatible Outlook/Gmail.
- Le scenario doit etre realiste mais PEDAGOGIQUE : on cherche a former,
  pas a humilier. Les "markers" doivent etre identifiables avec un peu
  d'attention.
- Le fromEmail doit etre un DOMAINE FICTIF (jamais un vrai domaine d'entreprise
  legitime). Privilegier les patterns "lookalike" : microsoft-security.com,
  colissimo-livraison.fr, banque-credit-info.com.
- NE JAMAIS inclure d'instruction exploit reelle (pas d'URL malveillante,
  pas de payload, pas de download .exe).
- NE JAMAIS cibler une vraie personne nommee. Toujours un role generique
  ("la comptable", "l'IT", "le PDG").
- Difficulty :
  * subtle : peu de red flags, exige une vraie attention. Mots usuels, ton calm.
  * medium : 3-4 red flags moyens. Urgence legere, domaine suspect.
  * brutal : 5+ red flags evidents. Faute orthographe, URL absurde, etc.
- Le champ markers : 3 a 5 indices CONCRETS et FACTUELS que l'apprenant
  aurait pu reperer. Pas de generalite.

FORMAT JSON ATTENDU (strict, retourne UNIQUEMENT ce JSON sans markdown wrap) :
{
  "subject": "string -- objet du mail, max 80 chars",
  "fromEmail": "string -- email expediteur fictif",
  "fromName": "string -- nom expediteur affiche",
  "bodyHtml": "string -- HTML inline simple",
  "markers": ["3 a 5 indices factuels"],
  "audienceRecommendation": "string -- a qui envoyer en priorite",
  "pedagogicalGoal": "string -- 2-3 phrases sur le but du scenario"
}`;

function buildUserPrompt(input: RedTeamInput): string {
  return [
    `Genere un scenario de phishing simule avec les parametres suivants :`,
    `- Secteur entreprise : ${input.sector}`,
    `- Contexte attaque visee : ${input.attackContext}`,
    `- Audience cible : ${input.targetAudience}`,
    `- Niveau difficulte : ${input.difficulty}`,
    ``,
    `Rappel : retourne UNIQUEMENT le JSON strict, sans \`\`\`json wrap ni texte autour.`,
  ].join("\n");
}

export async function generateRedTeamScenario(
  input: RedTeamInput,
): Promise<RedTeamResult> {
  if (process.env.DEMO_MODE === "true") {
    return { ok: true, scenario: demoFixture(input) };
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "no_api_key" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

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
        // Plus creatif pour la generation, mais structure
        temperature: 0.8,
        max_tokens: 1200,
        top_p: 0.95,
        // Forcer la sortie JSON (supporte par Mistral)
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        error:
          res.status === 429 ? "rate_limited_upstream" : `upstream_${res.status}`,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return { ok: false, error: "empty_response" };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "invalid_json" };
    }

    if (!isValidScenario(parsed)) {
      return { ok: false, error: "schema_mismatch" };
    }

    return { ok: true, scenario: parsed };
  } catch (e) {
    if (isAbortError(e)) return { ok: false, error: "timeout" };
    return { ok: false, error: "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}

function isValidScenario(obj: unknown): obj is RedTeamScenario {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.subject === "string" &&
    typeof o.fromEmail === "string" &&
    typeof o.fromName === "string" &&
    typeof o.bodyHtml === "string" &&
    Array.isArray(o.markers) &&
    o.markers.every((m) => typeof m === "string") &&
    typeof o.audienceRecommendation === "string" &&
    typeof o.pedagogicalGoal === "string"
  );
}

function demoFixture(input: RedTeamInput): RedTeamScenario {
  return {
    subject: `[URGENT] Validation virement fournisseur - secteur ${input.sector}`,
    fromEmail: "direction-finance@groupe-holding-paris.com",
    fromName: "Direction Financiere Groupe",
    bodyHtml: `<div style="font-family:Arial,sans-serif;padding:20px">
<p>Bonjour,</p>
<p>Je suis actuellement en deplacement et j'ai besoin de toi pour finaliser un virement urgent a notre nouveau fournisseur (signature du contrat hier soir).</p>
<p><strong>Montant : 18 750 EUR</strong></p>
<p>Je t'enverrai le RIB des que ma connexion sera meilleure. Discretion totale stp -- je t'expliquerai lundi.</p>
<p><a href="#" style="color:#0066cc">Confirmer la procedure</a></p>
<p>Merci. <em>Envoye depuis mon mobile.</em></p>
</div>`,
    markers: [
      "Domaine expediteur 'groupe-holding-paris.com' (jamais le vrai domaine officiel)",
      "Urgence + demande de confidentialite = combo classique fraude president",
      "Pas de canal de verification autre que le mail lui-meme",
      "Montant 'rond' typique de fraude (18 750 EUR), pas un montant lie a une facture reelle",
      "Signature mobile generique pour justifier l'absence de mise en forme propre",
    ],
    audienceRecommendation: `${input.targetAudience} (en priorite les juniors qui n'ont pas encore vu cette arnaque)`,
    pedagogicalGoal: `Faire vivre la fraude au president dans le contexte ${input.sector}. Apprendre que l'urgence + la confidentialite + la demande financiere = signal d'alarme maximum, meme si l'email semble venir de la direction.`,
  };
}
