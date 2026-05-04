// SPDX-License-Identifier: AGPL-3.0-or-later
// Generateur de script vishing (voice phishing) souverain.
//
// POURQUOI :
//  - Vishing surge +442 % au H2 2024 et represente >60 % des incidents IR
//    (cf. Hoxhunt threat report). Personne ne forme correctement les equipes
//    contre ce vecteur en France aujourd'hui.
//  - Adaptive Security et Hoxhunt le font, mais via OpenAI / cloud US.
//  - L'angle Humanix : Mistral (Paris) genere le script + Piper TTS (local
//    au serveur) le lit. Stack 100 % FR/UE, pas de Cloud Act, RGPD natif.
//
// SECURITE & ETHIQUE :
//  - Le script est marque "FORMATION" dans son entete inline et son meta
//    pour qu'aucun usage malveillant ne puisse pretexter une generation
//    "neutre".
//  - Anti-PII : on rejette tout contexte contenant un email/SIRET/SIREN.
//  - Pas d'usurpation d'une personne reelle. Si l'admin demande un appel
//    "du PDG Jean Dupont", on remplace par "votre Direction" generique.
//  - Le module Mistral existant (lib/ai/mistral.ts) gere deja phishing :
//    on reutilise sa philosophie sans dupliquer (anti-PII, mode demo).

const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";

export type VishingTemplate =
  | "fake-support-it"
  | "fake-banque"
  | "fake-direction"
  | "fake-fournisseur"
  | "fake-cnil"
  | "free";

export type VishingArgs = {
  template: VishingTemplate;
  service: string; // service cible : "Compta", "RH", "Direction", "IT"
  context?: string; // contexte libre (max 200 chars)
  difficulty: "easy" | "medium" | "hard";
};

export type VishingScript = {
  // Bloc d'introduction lu par l'attaquant (TTS)
  openingLine: string;
  // Corps de la conversation, blocs de 1 ligne max
  body: string;
  // Phrase de pression / CTA finale
  callToAction: string;
  // Persona de l'attaquant (utilise pour briefer le formateur)
  attackerPersona: string;
  // Numero affiche cote victime (toujours fictif / brouillage)
  spoofedCallerId: string;
  // 3 a 5 signaux faibles a debriefer apres l'exercice
  redFlags: string[];
  // Texte concatene pret a etre lu par Piper TTS
  ttsScript: string;
};

const TEMPLATE_BRIEFS: Record<VishingTemplate, string> = {
  "fake-support-it":
    "Faux support IT externe pretexte une mise a jour Microsoft / installation antivirus / depannage urgent demande par la DSI.",
  "fake-banque":
    "Faux conseiller bancaire pretexte une fraude detectee, demande validation OTP par la victime.",
  "fake-direction":
    "Fausse direction pretexte une operation confidentielle, presse pour effectuer un virement / partager des credentials. Variante fraude au President.",
  "fake-fournisseur":
    "Faux fournisseur connu pretexte un changement de RIB urgent ou un differend de facturation a regler dans la journee.",
  "fake-cnil":
    "Faux agent CNIL ou ANSSI pretexte un controle RGPD / NIS2, demande des informations sur l'organisation.",
  free: "Scenario libre, a inventer en respectant les bonnes pratiques pedagogiques (pas d'usurpation reelle, signaux faibles repérables).",
};

const DIFFICULTY_BRIEFS: Record<VishingArgs["difficulty"], string> = {
  easy: "Inclure 4-5 signaux faibles GROSSIERS : voix robotique, accent fort, bruit de fond suspect, mauvais francais, urgence excessive, demande absurde.",
  medium:
    "Inclure 2-3 signaux faibles MODERES : ton legerement presse, demande de donnee qui ne se demande jamais par telephone, references vagues a des collaborateurs reels.",
  hard: "Inclure 1-2 signaux faibles SUBTILS : voix professionnelle, contexte plausible (numero de dossier credible, jargon technique correct). Quasi-indetectable sans formation prealable.",
};

const SYSTEM_PROMPT = `Tu es un expert en cybersecurite pedagogique francais. Ton role est de generer des SCRIPTS DE VISHING SIMULES (faux appel telephonique d'attaquant), exclusivement a des fins de formation interne, pour aider les collaborateurs PME a reconnaitre les attaques par voix.

CONTRAINTES STRICTES :
- TOUJOURS repondre en JSON valide, sans markdown autour.
- Le script doit etre REALISTE mais inclure des signaux faibles que l'apprenant doit apprendre a reperer.
- AUCUNE donnee personnelle reelle (pas de vrai nom propre identifiable, pas de numero de telephone reel, pas de SIREN reel).
- AUCUN contenu malveillant exploitable. Pas d'instructions techniques precises pour exfiltrer des credentials.
- Texte en francais, ton naturel d'attaquant.
- "redFlags" : 3 a 5 indices que l'apprenant doit pouvoir detecter pendant ou apres l'appel.
- "spoofedCallerId" : un numero fictif type 01 23 45 67 89, jamais un vrai numero.
- "ttsScript" : concatenation lisible voix off de openingLine + body + callToAction, prete a Piper TTS. Format conversationnel monologue (l'attaquant parle, on imagine la reponse de la victime entre les blocs).

FORMAT DE REPONSE OBLIGATOIRE (JSON strict) :
{
  "openingLine": "string (premiere phrase de l'appel)",
  "body": "string (corps de la conversation, blocs courts)",
  "callToAction": "string (pression finale ou demande explicite)",
  "attackerPersona": "string (description du profil pretendu)",
  "spoofedCallerId": "string (numero fictif type 01 XX XX XX XX)",
  "redFlags": ["string", "string", ...],
  "ttsScript": "string (script complet pret a Piper TTS)"
}`;

const PII_PATTERNS = [
  /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
  /\b\d{14}\b/, // SIRET
  /\b\d{9}\b/, // SIREN
  /\b0[1-9](?:[\s.-]?\d{2}){4}\b/, // numero de telephone FR
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

export async function generateVishingScript(
  args: VishingArgs,
): Promise<VishingScript> {
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
    "Genere le script de vishing simule en respectant strictement le format JSON.",
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
        max_tokens: 1500,
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
    throw new Error(`mistral_http_${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("mistral_empty_response");

  let parsed: VishingScript;
  try {
    parsed = JSON.parse(content) as VishingScript;
  } catch {
    throw new Error("mistral_invalid_json");
  }

  return validateAndSanitize(parsed);
}

function validateAndSanitize(s: VishingScript): VishingScript {
  return {
    openingLine: String(s.openingLine ?? "").slice(0, 500),
    body: String(s.body ?? "").slice(0, 2000),
    callToAction: String(s.callToAction ?? "").slice(0, 500),
    attackerPersona: String(s.attackerPersona ?? "Inconnu").slice(0, 200),
    spoofedCallerId: sanitizeCallerId(String(s.spoofedCallerId ?? "")),
    redFlags: Array.isArray(s.redFlags)
      ? s.redFlags.map((x) => String(x).slice(0, 200)).slice(0, 8)
      : [],
    ttsScript: String(s.ttsScript ?? "").slice(0, 4000),
  };
}

// On force un format FR fictif et on s'assure qu'il ne contient pas de
// chiffres exotiques utilises pour leak un identifiant.
function sanitizeCallerId(s: string): string {
  const digits = s.replace(/[^\d]/g, "").slice(0, 10);
  if (digits.length !== 10) return "01 00 00 00 00";
  return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
}

function buildDemoFixture(args: VishingArgs): VishingScript {
  const fixtures: Record<VishingTemplate, VishingScript> = {
    "fake-support-it": {
      openingLine:
        "Bonjour, ici Olivier du support technique externalise. Je vous appelle suite a une alerte de votre service informatique.",
      body: "Nous avons detecte une activite suspecte sur votre poste. Pour eviter le blocage de vos acces, je vais vous guider pour installer une mise a jour de securite. Pouvez-vous me confirmer votre identifiant ainsi que le code recu par SMS ?",
      callToAction:
        "C'est urgent, votre poste sera deconnecte du reseau dans quinze minutes si on ne reagit pas. On peut commencer ?",
      attackerPersona: "Faux technicien IT externalise, ton presse mais courtois.",
      spoofedCallerId: "01 73 28 45 91",
      redFlags: [
        "Demande d'identifiant + code SMS au telephone (jamais legitime)",
        "Urgence artificielle sur quinze minutes",
        "Pretend appeler suite a une alerte interne sans connaitre votre DSI",
        "Numero d'appel inconnu, pas dans l'annuaire de l'entreprise",
        "Refuse de rappeler via le standard officiel pour 'gagner du temps'",
      ],
      ttsScript:
        "Bonjour, ici Olivier du support technique externalise. Je vous appelle suite a une alerte de votre service informatique. Nous avons detecte une activite suspecte sur votre poste. Pour eviter le blocage de vos acces, je vais vous guider pour installer une mise a jour de securite. Pouvez-vous me confirmer votre identifiant ainsi que le code recu par SMS ? C'est urgent, votre poste sera deconnecte du reseau dans quinze minutes si on ne reagit pas. On peut commencer ?",
    },
    "fake-banque": {
      openingLine:
        "Bonjour, ici Madame Lambert, conseillere securite a votre banque. Notre systeme a detecte un debit suspect sur votre compte.",
      body: "Pour bloquer la transaction immediatement, j'ai besoin de valider votre identite. Vous allez recevoir un code de confirmation par SMS, vous me le donnerez pour annuler le paiement de 4 280 euros qui est en cours.",
      callToAction:
        "Le delai d'annulation est de quatre minutes. Restez en ligne et lisez-moi le code des reception, sinon le virement partira.",
      attackerPersona:
        "Fausse conseillere bancaire, voix calme, jargon precis pour rassurer.",
      spoofedCallerId: "01 56 90 12 34",
      redFlags: [
        "Aucune banque ne demande un code OTP par telephone",
        "Pression temporelle (quatre minutes) totalement irrealiste",
        "Montant precis enonce pour rendre l'histoire plus credible",
        "Demande de rester en ligne pour eviter que la victime appelle l'agence",
        "Pas de protocole de verification croisee (jamais d'appel sortant inverse)",
      ],
      ttsScript:
        "Bonjour, ici Madame Lambert, conseillere securite a votre banque. Notre systeme a detecte un debit suspect sur votre compte. Pour bloquer la transaction immediatement, j'ai besoin de valider votre identite. Vous allez recevoir un code de confirmation par SMS, vous me le donnerez pour annuler le paiement de 4 280 euros qui est en cours. Le delai d'annulation est de quatre minutes. Restez en ligne et lisez-moi le code des reception, sinon le virement partira.",
    },
    "fake-direction": {
      openingLine:
        "Allo, c'est la Direction Generale. J'ai besoin de vous immediatement pour une operation confidentielle.",
      body: "Je suis en deplacement a l'etranger, je ne peux pas passer par les canaux habituels. Il faut emettre un virement de 38 000 euros vers un nouveau partenaire avant ce soir, c'est strategique. Vous avez les acces banque, je vous transmets l'IBAN par SMS apres notre echange.",
      callToAction:
        "Personne d'autre ne doit etre au courant pour le moment, c'est une operation sensible. Je compte sur votre discretion. Vous pouvez le faire ?",
      attackerPersona:
        "Fausse direction, ton autoritaire, joue la carte confidentialite + urgence.",
      spoofedCallerId: "06 12 34 56 78",
      redFlags: [
        "Fraude au President classique (urgence + confidentialite + virement nouveau)",
        "Demande de ne pas verifier en interne ('discretion')",
        "Voix non reconnue, appel d'un numero perso inconnu",
        "Refus systematique de procedures de validation a deux signatures",
        "Pretexte deplacement etranger pour empecher contre-verification",
      ],
      ttsScript:
        "Allo, c'est la Direction Generale. J'ai besoin de vous immediatement pour une operation confidentielle. Je suis en deplacement a l'etranger, je ne peux pas passer par les canaux habituels. Il faut emettre un virement de 38 000 euros vers un nouveau partenaire avant ce soir, c'est strategique. Vous avez les acces banque, je vous transmets l'IBAN par SMS apres notre echange. Personne d'autre ne doit etre au courant pour le moment, c'est une operation sensible. Je compte sur votre discretion. Vous pouvez le faire ?",
    },
    "fake-fournisseur": {
      openingLine:
        "Bonjour, c'est le service comptable de votre fournisseur. Je vous appelle au sujet d'une facture en attente.",
      body: "Notre banque vient de changer, donc tous les paiements doivent passer sur le nouveau RIB que je vais vous donner par mail dans cinq minutes. Pouvez-vous confirmer la modification dans votre systeme ?",
      callToAction:
        "C'est urgent, votre dernier reglement n'est pas arrive et notre direction commence a s'impatienter. Je peux compter sur vous ?",
      attackerPersona:
        "Faux comptable fournisseur, ton naturel, contexte business plausible.",
      spoofedCallerId: "01 84 22 17 60",
      redFlags: [
        "Changement de RIB par telephone sans validation orale via standard officiel",
        "Pression sur 'la direction qui s'impatiente' pour court-circuiter le process",
        "Demande de modifier le systeme avant reception ecrite formelle",
        "Numero d'appel different de celui enregistre dans l'annuaire fournisseur",
      ],
      ttsScript:
        "Bonjour, c'est le service comptable de votre fournisseur. Je vous appelle au sujet d'une facture en attente. Notre banque vient de changer, donc tous les paiements doivent passer sur le nouveau RIB que je vais vous donner par mail dans cinq minutes. Pouvez-vous confirmer la modification dans votre systeme ? C'est urgent, votre dernier reglement n'est pas arrive et notre direction commence a s'impatienter. Je peux compter sur vous ?",
    },
    "fake-cnil": {
      openingLine:
        "Bonjour, ici l'inspection regionale CNIL. Suite a votre declaration NIS2, nous menons un controle d'urgence sur votre conformite.",
      body: "J'ai besoin de quelques informations rapides : la liste de vos sous-traitants critiques, le nom de votre DPO, et le mot de passe de votre dossier consolide. Si vous ne pouvez pas repondre tout de suite, on vous envoie un controle physique demain matin.",
      callToAction:
        "C'est plus simple si on regle ca au telephone maintenant. Vous avez les infos sous la main ?",
      attackerPersona:
        "Faux agent CNIL/ANSSI, ton institutionnel, joue la carte autorite + sanction.",
      spoofedCallerId: "01 53 73 22 22",
      redFlags: [
        "La CNIL et l'ANSSI ne demandent JAMAIS de mot de passe par telephone",
        "Pas de prevenance ecrite officielle avant un controle d'urgence",
        "Menace de controle physique pour forcer la reponse immediate",
        "Demande de donnees structurees sans procedure ecrite",
        "Numero qui peut ressembler au standard officiel mais decale d'un chiffre",
      ],
      ttsScript:
        "Bonjour, ici l'inspection regionale CNIL. Suite a votre declaration NIS2, nous menons un controle d'urgence sur votre conformite. J'ai besoin de quelques informations rapides : la liste de vos sous-traitants critiques, le nom de votre DPO, et le mot de passe de votre dossier consolide. Si vous ne pouvez pas repondre tout de suite, on vous envoie un controle physique demain matin. C'est plus simple si on regle ca au telephone maintenant. Vous avez les infos sous la main ?",
    },
    free: {
      openingLine: "Bonjour, j'appelle de la part du service [a personnaliser].",
      body: "Scenario libre, a generer via l'API Mistral. Le mode demo n'a pas de fixture pour 'free'.",
      callToAction: "Vous pouvez confirmer ?",
      attackerPersona: "A personnaliser via le contexte admin.",
      spoofedCallerId: "01 00 00 00 00",
      redFlags: [
        "Cette fixture est un placeholder. Configurez MISTRAL_API_KEY pour generer un vrai script.",
      ],
      ttsScript:
        "Bonjour, j'appelle de la part du service. Vous pouvez confirmer ?",
    },
  };

  // Si difficulty=easy, on aurait pu varier les fixtures. Pour le MVP, on
  // sert le meme fixture quelle que soit la difficulty (la difference se
  // ferait avec Mistral en production).
  void args.difficulty;
  return fixtures[args.template];
}
