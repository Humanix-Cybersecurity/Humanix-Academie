// SPDX-License-Identifier: AGPL-3.0-or-later
// Generateur de SMS smishing souverain.
//
// POURQUOI :
//  - Le smishing represente une part croissante des incidents (livraisons,
//    impots, banque) et touche autant les pros que les particuliers.
//  - L'angle Humanix : Mistral (Paris) genere le SMS, anti-PII strict,
//    marqueur FORMATION inline, jamais d'envoi automatique cote app
//    (envoi a la charge du client via son provider OVH/Octopush/Brevo
//    OU forfait sur mesure, jamais inclus dans nos plans).
//
// SECURITE & ETHIQUE :
//  - Le SMS contient toujours un marqueur "[FORMATION HUMANIX]" en debut
//    pour qu'aucun usage malveillant ne puisse pretexter une generation
//    "neutre".
//  - Anti-PII : on rejette tout contexte contenant un email/SIRET/SIREN/
//    numero de telephone (regex partagees avec lib/vishing).
//  - Pas d'usurpation d'une personne reelle : si l'admin demande un SMS
//    "du PDG Jean Dupont", on remplace par "votre Direction" generique.

const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";

const FORMATION_MARKER = "[FORMATION HUMANIX]";

export type SmishingTemplate =
  | "fake-livreur"
  | "fake-banque"
  | "fake-impots"
  | "fake-2fa"
  | "fake-president";

export type SmishingArgs = {
  template: SmishingTemplate;
  service: string; // service cible : "Compta", "RH", "Direction", "IT"
  context?: string; // contexte libre (max 200 chars)
  difficulty: "easy" | "medium" | "hard";
};

export type SmishingScript = {
  // Le SMS final pret a etre envoye (avec marqueur FORMATION inline)
  smsBody: string;
  // Numero affiche cote victime (toujours fictif type "37501" ou "+33 9...")
  spoofedSender: string;
  // Persona / pretexte de l'attaquant
  attackerPersona: string;
  // 3 a 5 signaux faibles a debriefer apres
  redFlags: string[];
  // Conseil reflexe pedagogique
  goodReflex: string;
};

const TEMPLATE_BRIEFS: Record<SmishingTemplate, string> = {
  "fake-livreur":
    "Faux SMS livreur (La Poste/Chronopost/Colissimo/UPS) qui pretexte des frais de douane ou re-livraison a payer via un lien.",
  "fake-banque":
    "Faux SMS bancaire qui annonce une tentative de paiement suspecte et demande validation via lien (faux portail).",
  "fake-impots":
    "Faux SMS impots/ANTS qui annonce un trop-percu remboursable, demande de verifier l'IBAN ou de fournir des donnees.",
  "fake-2fa":
    "Faux SMS de 'support' qui demande de partager le code 2FA recu en parallele (code reel envoye en distraction).",
  "fake-president":
    "Faux SMS du dirigeant pretendant un dossier confidentiel urgent, demande de repondre par WhatsApp ou de virer.",
};

const DIFFICULTY_BRIEFS: Record<SmishingArgs["difficulty"], string> = {
  easy: "Inclure 3-4 signaux faibles GROSSIERS : fautes d'orthographe, URL exotique (.xyz, .top), urgence absurde, expediteur visiblement etranger.",
  medium:
    "Inclure 2-3 signaux faibles MODERES : URL plausible mais legerement modifiee (laposte-fr.com), urgence raisonnable mais inhabituelle, demande qui ne se fait jamais par SMS.",
  hard: "Inclure 1-2 signaux faibles SUBTILS : URL credible (bitly avec slug propre), francais correct, montant realiste, contexte plausible saisonnier (impots en mai, soldes en juin, etc.).",
};

const SYSTEM_PROMPT = `Tu es un expert en cybersecurite pedagogique francais. Ton role est de generer des SMS DE SMISHING SIMULES (faux SMS d'attaquant), exclusivement a des fins de formation interne, pour aider les collaborateurs PME a reconnaitre les attaques par SMS.

CONTRAINTES STRICTES :
- TOUJOURS repondre en JSON valide, sans markdown autour.
- Le SMS commence OBLIGATOIREMENT par "${FORMATION_MARKER}" suivi du contenu pedagogique.
- Le SMS doit etre REALISTE mais inclure des signaux faibles que l'apprenant doit apprendre a reperer.
- AUCUNE donnee personnelle reelle (pas de vrai nom propre identifiable, pas de numero de telephone reel, pas de SIREN reel, pas d'IBAN reel — toujours fictifs).
- AUCUN contenu malveillant exploitable.
- "smsBody" : 160 chars max marqueur FORMATION inclus, en francais natif francophone.
- "spoofedSender" : un sender ID fictif type 5 chiffres "37501" OU un pseudo-numero "+33 9 XX XX XX XX".
- "redFlags" : 3 a 5 indices que l'apprenant doit detecter dans le SMS.
- "goodReflex" : 1 phrase indiquant le bon reflexe (ex : "Ne jamais cliquer ; verifier en passant par l'app officielle").

FORMAT DE REPONSE OBLIGATOIRE (JSON strict) :
{
  "smsBody": "string (le SMS complet avec marqueur FORMATION en tete)",
  "spoofedSender": "string (sender ID fictif)",
  "attackerPersona": "string (description du profil pretendu)",
  "redFlags": ["string", "string", ...],
  "goodReflex": "string (le bon reflexe en 1 phrase)"
}`;

const PII_PATTERNS = [
  /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
  /\b\d{14}\b/, // SIRET
  /\b\d{9}\b/, // SIREN
  // Numero de telephone FR : national + international.
  // Accepte un separateur optionnel apres +33 / 0033 (ex: "+33 6 12 34 56 78").
  /(?:(?:\+33|0033)[\s.-]?[1-9]|\b0[1-9])(?:[\s.-]?\d{2}){4}\b/,
];

export function detectPII(text: string): string | null {
  for (const re of PII_PATTERNS) {
    if (re.test(text)) {
      return "Donnee personnelle detectee dans le contexte (email, telephone, SIREN, SIRET). Retirez-la avant de generer.";
    }
  }
  return null;
}

export function isMistralEnabled(): boolean {
  return Boolean(process.env.MISTRAL_API_KEY);
}

export async function generateSmishingScript(
  args: SmishingArgs,
): Promise<SmishingScript> {
  if (args.context) {
    const piiError = detectPII(args.context);
    if (piiError) throw new Error(piiError);
  }

  if (!isMistralEnabled() || process.env.DEMO_MODE === "true") {
    return buildDemoFixture(args);
  }

  const userPrompt = [
    `Template : ${TEMPLATE_BRIEFS[args.template]}`,
    `Service cible : ${args.service}`,
    `Niveau de difficulte : ${DIFFICULTY_BRIEFS[args.difficulty]}`,
    args.context
      ? `Contexte additionnel fourni par l'admin : ${args.context}`
      : "",
    "",
    "Genere le SMS de smishing simule en respectant strictement le format JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(MISTRAL_API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.MISTRAL_MODEL ?? "ministral-8b-latest",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
  } catch (e: unknown) {
    const name = (e as { name?: string } | null)?.name;
    throw new Error(
      name === "AbortError" ? "mistral_timeout" : "mistral_unreachable",
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`mistral_error_${res.status}:${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(content) as SmishingScript;

  // Force le marqueur FORMATION s'il a ete oublie par le LLM
  if (!parsed.smsBody.includes(FORMATION_MARKER)) {
    parsed.smsBody = `${FORMATION_MARKER} ${parsed.smsBody}`;
  }

  return parsed;
}

/**
 * Fixture demo pour l'environnement DEMO_MODE ou sans cle Mistral.
 * Permet de developper / showcaser sans facture LLM.
 */
function buildDemoFixture(args: SmishingArgs): SmishingScript {
  const fixtures: Record<SmishingTemplate, SmishingScript> = {
    "fake-livreur": {
      smsBody: `${FORMATION_MARKER} Votre colis Chronoposte est bloque. 1.99€ de frais de re-livraison a payer : http://chrono-livraison-fr.top/payer Code suivi : CHR47832`,
      spoofedSender: "37501",
      attackerPersona:
        "Faux service livreur — exploite l'attente d'un colis post-soldes / Black Friday pour pousser au clic.",
      redFlags: [
        "Domaine .top inhabituel (jamais utilise par Chronopost)",
        "Faute Chronoposte (avec un e en plus)",
        "Frais minimes pour banaliser l'arnaque",
        "Sender ID 37501 non officiel",
      ],
      goodReflex:
        "Verifier en allant directement sur chronopost.fr depuis l'app, jamais via le lien du SMS.",
    },
    "fake-banque": {
      smsBody: `${FORMATION_MARKER} BANQUE: Tentative de paiement 547€ chez AMAZON.UK. Si non reconnu, bloquer ici : https://bnp-secure-fr.xyz/stop`,
      spoofedSender: "BNP-SECU",
      attackerPersona:
        "Faux service securite bancaire — joue sur la peur de fraude carte.",
      redFlags: [
        "Domaine .xyz suspect",
        "Pas de personnalisation (votre nom)",
        "Lien direct vers une action critique",
        "Sender ID alphanumerique non officiel",
        "Montant precis pour donner credibilite",
      ],
      goodReflex:
        "Appeler le numero au dos de votre carte pour verifier directement.",
    },
    "fake-impots": {
      smsBody: `${FORMATION_MARKER} Service-Public.fr: Trop-percu de 213,40€ a vous remboursser. Confirmez votre IBAN : http://impots-rembours.eu/iban`,
      spoofedSender: "37500",
      attackerPersona:
        "Faux service impots — exploite la confiance institutionnelle, surtout en mai-juin.",
      redFlags: [
        "Faute remboursser",
        "Domaine .eu non officiel (impots c'est .gouv.fr)",
        "Demande IBAN par SMS (jamais)",
        "Montant precis avec virgule pour credibilite",
      ],
      goodReflex:
        "Les impots ne demandent jamais d'IBAN par SMS. Se connecter directement sur impots.gouv.fr.",
    },
    "fake-2fa": {
      smsBody: `${FORMATION_MARKER} Microsoft: Code de validation 4-7-2-8-9-1. NE PAS COMMUNIQUER. Notre support va vous appeler pour confirmer.`,
      spoofedSender: "MICROSOFT",
      attackerPersona:
        "Distraction : un vrai 2FA est declenche par l'attaquant en parallele d'un appel pour pousser le code.",
      redFlags: [
        "Microsoft ne dit jamais 'notre support va vous appeler'",
        "Code 2FA legitime ne devrait jamais etre 'a confirmer' a quiconque",
        "Combine appel + SMS = signature classique de smishing relai",
      ],
      goodReflex:
        "Un code 2FA ne se partage JAMAIS, meme avec le 'support' qui appelle. Raccrocher.",
    },
    "fake-president": {
      smsBody: `${FORMATION_MARKER} ${args.service ? `Bonjour ${args.service.split(",")[0]}, ` : ""}c'est la Direction. Operation confidentielle, repondez sur WhatsApp +33 6 12 34 56 78. Ne pas en parler aux autres.`,
      spoofedSender: "+33 6 11 22 33 44",
      attackerPersona:
        "Faux dirigeant — pretexte une operation confidentielle pour basculer sur WhatsApp (hors traçabilite entreprise).",
      redFlags: [
        "Bascule WhatsApp (hors logs entreprise)",
        "Demande de discretion absolue",
        "Numero perso inconnu",
        "Pression hierarchique implicite",
      ],
      goodReflex:
        "Verifier de visu ou via le canal officiel (Teams, telephone fixe entreprise) AVANT toute action.",
    },
  };
  return fixtures[args.template];
}
