// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helper IA d'explication pedagogique adaptee au persona.
//
// CAS D'USAGE PRINCIPAL :
//   User clique sur "Pourquoi ce mail etait suspect ?" sur la landing
//   phishing. On envoie a Mistral le contexte (template, red flags
//   objectifs) + le persona infere de l'user. Mistral genere une
//   explication adaptee :
//     - persona "beginner" : "Imagine une lettre dans ta boite aux
//       lettres, mais l'expediteur a marque le mauvais nom..."
//     - persona "technical" : "L'enregistrement SPF du domaine d'envoi
//       ne match pas, le DKIM est absent, le reverse DNS pointe..."
//     - persona "finance" : "C'est une variante classique de la fraude
//       au president (memo CRA n°2023-12)..."
//
// SECURITE :
//   - Pas de PII envoyee a Mistral (on filtre cote caller)
//   - Reponse plain text, pas d'execution de code
//   - Rate limit cote API route (10 req/h/user) pour eviter les couts
//     d'abus
//
// MODELE : ministral-8b-latest (rapide, suffisant pour 200-400 mots
// d'explication pedagogique. Si ROI prouvé, monter en mistral-small).

import { isAbortError } from "@/lib/errors";
import { type Persona, PERSONA_BRIEFS } from "./persona";

const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";
const MODEL = "ministral-8b-latest";

export type ExplainTopic =
  | "phishing_email"
  | "phishing_indicator" // un indicateur specifique (domaine, ton, urgence...)
  | "concept" // concept cyber generique : SPF, DKIM, MFA, etc.
  | "ioc"; // un IOC technique : IP, hash, URL malveillante

export type ExplainRequest = {
  topic: ExplainTopic;
  /** Question / sujet a expliquer en clair (court, < 200 chars) */
  question: string;
  /** Contexte structure pour l'IA (template phishing, red flags, etc.) */
  context?: {
    templateName?: string;
    redFlags?: string[];
    fromDomain?: string;
    /** Tout autre detail factuel non-PII (max ~500 chars) */
    extra?: string;
  };
  persona: Persona;
};

export type ExplainResult =
  | { ok: true; explanation: string; tokensUsed?: number }
  | { ok: false; error: ExplainError; details?: string };

export type ExplainError =
  | "no_api_key"
  | "rate_limited_upstream"
  | "upstream_error"
  | "timeout"
  | "invalid_question"
  | "demo_mode";

const SYSTEM_BASE = `Tu es Hex, le compagnon pedagogique de Humanix Academie.
Tu expliques les concepts cybersecurite de maniere claire et adaptee
au profil de l'utilisateur. Tu es CHALEUREUX mais factuel : pas de
catastrophisme, pas de jargon inutile.

REGLES STRICTES :
- Reponse en FRANCAIS uniquement.
- Format : 3 a 6 phrases courtes. Pas de titres "##", pas de listes
  a puces sauf si vraiment pertinent (max 4 items).
- Termine par une phrase d'action concrete que l'user peut faire
  AUJOURD'HUI ("la prochaine fois, fais X").
- Ne jamais inventer de fait technique. Si tu ne sais pas, dis-le.
- Ne JAMAIS demander d'informations personnelles a l'user.
- Ne JAMAIS donner de conseil qui mettrait quelqu'un en danger
  (refus poli si c'est demande).`;

function buildPrompt(req: ExplainRequest): {
  system: string;
  user: string;
} {
  const personaBrief = PERSONA_BRIEFS[req.persona];
  const system = `${SYSTEM_BASE}

PERSONA UTILISATEUR : ${personaBrief}`;

  let userMsg = `Question : ${req.question.trim().slice(0, 500)}`;
  if (req.context) {
    const lines: string[] = ["", "Contexte factuel :"];
    if (req.context.templateName) {
      lines.push(`- Template : ${req.context.templateName}`);
    }
    if (req.context.fromDomain) {
      lines.push(`- Domaine expediteur : ${req.context.fromDomain}`);
    }
    if (req.context.redFlags && req.context.redFlags.length > 0) {
      lines.push(
        `- Signaux faibles identifies : ${req.context.redFlags
          .slice(0, 6)
          .map((f) => f.slice(0, 200))
          .join(" ; ")}`,
      );
    }
    if (req.context.extra) {
      lines.push(`- Detail : ${req.context.extra.slice(0, 500)}`);
    }
    userMsg += lines.join("\n");
  }
  return { system, user: userMsg };
}

export async function explain(
  req: ExplainRequest,
): Promise<ExplainResult> {
  if (process.env.DEMO_MODE === "true") {
    // En mode demo : reponse fixture pour montrer l'UX sans bruler de
    // tokens API (et sans dependre du reseau)
    return {
      ok: true,
      explanation: demoFixture(req),
    };
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "no_api_key" };
  }

  if (!req.question || req.question.trim().length < 3) {
    return { ok: false, error: "invalid_question" };
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
        temperature: 0.6, // un peu cosy mais pas hallucinant
        max_tokens: 400, // ~200-300 mots, suffisant pour 3-6 phrases
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
    const explanation = (data.choices?.[0]?.message?.content ?? "").trim();
    if (!explanation) {
      return {
        ok: false,
        error: "upstream_error",
        details: "Reponse vide du modele",
      };
    }
    return {
      ok: true,
      explanation,
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
 * Fixture pour le mode demo : on simule une reponse IA sans appeler
 * Mistral (gain de tokens + latence + dependance reseau). Suffit pour
 * montrer l'UX a un prospect.
 */
function demoFixture(req: ExplainRequest): string {
  const personaTone: Record<Persona, string> = {
    beginner:
      "Imagine que tu reçois une lettre dans ta boîte aux lettres, mais l'enveloppe a la mauvaise écriture du facteur habituel : c'est exactement ça. Le domaine d'envoi est faux, le ton sent l'urgence forcée, et les vrais services n'envoient jamais ce genre de message par email. La prochaine fois : avant de cliquer, regarde bien le domaine après le @ et demande-toi « est-ce que c'est exactement comme d'habitude ? ».",
    technical:
      "Trois indicateurs convergent ici : le domaine envoyeur n'a pas de SPF aligné (vérifie via mxtoolbox), le DKIM est manquant ce qui empêche l'authentification cryptographique, et le reply-to pointe vers un domaine différent du from - pattern classique de spoofing. La prochaine fois : ouvre les en-têtes complets du mail et vérifie SPF/DKIM/DMARC avant toute action sensible.",
    manager:
      "Ce type d'attaque exploite la pression hiérarchique pour court-circuiter les processus de validation. L'enjeu n'est pas technique mais procédural : nos garde-fous (double validation virement, vérification hors-canal) doivent être rappelés régulièrement. Côté COMEX, c'est un risque NIS2 et de protection de la marque. La prochaine fois : confirme par téléphone toute demande financière inhabituelle, peu importe l'expéditeur.",
    developer:
      "Pattern OWASP A07:2021 - Identification and Authentication Failures, étendu au social engineering. Le domaine d'envoi exploite typo-squatting (cf. règles courantes : caractères Unicode IDN, sous-domaines longs). Côté supply chain, vérifie aussi tes dépendances de confiance avec npm audit / socket.dev. La prochaine fois : ajoute SPF/DMARC en monitoring sur tes domaines de boîtes mail support.",
    finance:
      "C'est une variante du business email compromise (BEC) ou « fraude au président ». Le pattern : urgence + confidentialité + virement vers un IBAN inhabituel. Selon Tracfin, ces fraudes ont coûté 1,3 Md€ aux entreprises françaises en 2023. La prochaine fois : applique TOUJOURS la procédure de double validation hors-canal (téléphone vers numéro connu, jamais via le mail), même si ça parait paranoïaque.",
    hr: "Cette attaque cible souvent les RH parce qu'elles manipulent données personnelles et processus sensibles (paie, recrutement). C'est un cas classique d'ingénierie sociale exploitant l'urgence. Au-delà de la fuite RGPD potentielle, l'impact RH inclut les démarches obligatoires CNIL en 72h. La prochaine fois : pour toute modification de RIB salarié, exige un appel sortant au numéro connu - pas une réponse au mail reçu.",
    ops: "Ce type de mail vise souvent à obtenir un accès initial qui se transforme ensuite en ransomware sur le SI metier. Côté ops, l'enjeu est la continuité : un clic = potentiellement 24-72h de SI hors service. La prochaine fois : signale immédiatement (canal helpdesk dédié) et n'attends pas de voir si « c'est grave » - la rapidité du signalement est notre meilleur outil de containment.",
  };
  return personaTone[req.persona];
}
