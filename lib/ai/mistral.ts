// Client Mistral pour la génération de contenu cyber pédagogique.
//
// POURQUOI MISTRAL :
//  - Souverain français (Mistral AI, Paris) — RGPD natif
//  - API REST simple, format compatible OpenAI
//  - Modèle "ministral-8b-latest" suffit largement pour générer un mail
//    de phishing convaincant en français (latence ~2-4 s)
//
// SECURITE :
//  - La clé MISTRAL_API_KEY n'est JAMAIS exposée côté client
//  - On n'envoie aucune PII tenant dans le prompt (juste un nom de service
//    générique type "Compta", "RH", "Direction")
//  - Garde-fous : on REFUSE de générer si le prompt contient un nom propre
//    réel ou un email réel
//  - Les prompts générés sont systématiquement encadrés "phishing simulé
//    pour formation cyber, ne pas envoyer en production sans validation"

const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";

export type GeneratePhishingArgs = {
  template: "fake-microsoft" | "fake-fournisseur" | "fake-rh" | "fake-banque" | "fake-livreur" | "free";
  service: string; // "Compta", "RH", "Direction", "IT", etc.
  context?: string; // contexte libre (max 200 chars) que l'admin peut ajouter
  difficulty: "easy" | "medium" | "hard";
};

export type GeneratedPhishing = {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  redFlags: string[]; // Liste des signaux faibles à débriefer après simulation
  fromName: string;
  fromEmail: string;
};

const TEMPLATE_BRIEFS: Record<GeneratePhishingArgs["template"], string> = {
  "fake-microsoft":
    "Faux mail Microsoft 365 demandant une vérification de mot de passe ou de quota mailbox.",
  "fake-fournisseur":
    "Faux mail d'un fournisseur réel demandant un changement de RIB ou paiement urgent.",
  "fake-rh":
    "Faux mail RH demandant la confirmation d'informations bancaires ou personnelles pour la paie.",
  "fake-banque":
    "Faux mail bancaire demandant une validation d'opération ou mise à jour de coordonnées.",
  "fake-livreur":
    "Faux mail Colissimo, Chronopost ou DHL demandant un paiement de douane ou re-livraison.",
  free: "Phishing libre, à inventer en respectant les bonnes pratiques pédagogiques.",
};

const DIFFICULTY_BRIEFS: Record<GeneratePhishingArgs["difficulty"], string> = {
  easy: "Inclure 4-5 signaux faibles GROSSIERS (faute d'orthographe, URL bizarre, urgence excessive, salutation impersonnelle).",
  medium: "Inclure 2-3 signaux faibles MODERES (URL légèrement décalée, ton un peu pressé, demande inhabituelle).",
  hard: "Inclure 1-2 signaux faibles SUBTILS (différence d'un caractère dans le domaine, ton plausible, demande crédible). Quasi-indétectable sans vigilance.",
};

const SYSTEM_PROMPT = `Tu es un expert en cybersécurité pédagogique français. Ton rôle est de générer des MAILS DE PHISHING SIMULÉS, exclusivement à des fins de formation interne, pour aider les collaborateurs PME à reconnaître les attaques.

CONTRAINTES STRICTES :
- TOUJOURS répondre en JSON valide, sans markdown autour.
- Le mail doit être REALISTE mais inclure des signaux faibles que l'apprenant doit apprendre à repérer.
- AUCUNE donnée personnelle réelle (pas de vrai nom propre, pas d'email réel, pas de numéro de SIREN).
- AUCUN contenu malveillant exploitable (pas de macro, pas de lien réel, pas de payload). Les URL sont fictives type "secure-update-microsoft365.example".
- Texte en français, ton naturel, pas de fautes (sauf si difficulté = easy où on peut en glisser une volontairement).
- Liste des "red_flags" : 3 à 5 indices que l'apprenant doit pouvoir détecter.

FORMAT DE REPONSE OBLIGATOIRE (JSON strict) :
{
  "subject": "string",
  "bodyText": "string (mail texte brut, sauts de ligne avec \\n)",
  "bodyHtml": "string (mail HTML simple, balises p/br/a/strong uniquement)",
  "redFlags": ["string", "string", ...],
  "fromName": "string (nom expéditeur fictif)",
  "fromEmail": "string (email expéditeur fictif, domaine .example ou .test)"
}`;

/**
 * Anti-injection : on refuse les prompts qui contiennent visiblement
 * un email réel ou un nom propre courant. Cette validation est best-effort
 * et n'empêche pas un usage légitime ; elle bloque juste les usages
 * accidentels qui leak des PII.
 */
const PII_PATTERNS = [
  /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
  /\b\d{14}\b/, // SIRET
  /\b\d{9}\b/, // SIREN
];

export function detectPII(text: string): string | null {
  for (const re of PII_PATTERNS) {
    if (re.test(text)) return "Donnée personnelle détectée dans le contexte (email, SIREN, SIRET). Retirez-la avant de générer.";
  }
  return null;
}

/**
 * Indique si Mistral est configuré (clé API renseignée).
 */
export function isMistralEnabled(): boolean {
  return Boolean(process.env.MISTRAL_API_KEY);
}

/**
 * Génère un mail de phishing simulé via Mistral.
 * Mode demo (sans clé) : retourne un fixture statique pour pouvoir tester
 * l'UI sans facturation.
 */
export async function generatePhishing(
  args: GeneratePhishingArgs,
): Promise<GeneratedPhishing> {
  // Garde-fou anti-PII sur le contexte libre
  if (args.context) {
    const piiError = detectPII(args.context);
    if (piiError) throw new Error(piiError);
  }

  // Mode demo / DEMO_MODE / pas de clé → fixture
  if (!isMistralEnabled() || process.env.DEMO_MODE === "true") {
    return buildDemoFixture(args);
  }

  const userPrompt = [
    `Template : ${TEMPLATE_BRIEFS[args.template]}`,
    `Service cible : ${args.service}`,
    `Niveau de difficulté : ${DIFFICULTY_BRIEFS[args.difficulty]}`,
    args.context ? `Contexte additionnel fourni par l'admin : ${args.context}` : "",
    "",
    "Génère le mail de phishing simulé en respectant strictement le format JSON.",
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
  } catch (e: any) {
    throw new Error(e?.name === "AbortError" ? "mistral_timeout" : "mistral_unreachable");
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

  let parsed: GeneratedPhishing;
  try {
    parsed = JSON.parse(content) as GeneratedPhishing;
  } catch {
    throw new Error("mistral_invalid_json");
  }

  return validateAndSanitize(parsed);
}

/**
 * Sanitization : on neutralise tout HTML potentiellement dangereux dans
 * bodyHtml et on tronque les champs trop longs.
 */
function validateAndSanitize(g: GeneratedPhishing): GeneratedPhishing {
  return {
    subject: String(g.subject ?? "").slice(0, 200),
    bodyText: String(g.bodyText ?? "").slice(0, 4000),
    bodyHtml: sanitizeHtml(String(g.bodyHtml ?? "").slice(0, 6000)),
    redFlags: Array.isArray(g.redFlags)
      ? g.redFlags.map((s) => String(s).slice(0, 200)).slice(0, 8)
      : [],
    fromName: String(g.fromName ?? "Service Inconnu").slice(0, 100),
    fromEmail: String(g.fromEmail ?? "noreply@example.test").slice(0, 200),
  };
}

/**
 * Sanitisation HTML basique : on ne garde que les balises sûres pour un
 * preview de mail. Pas de script, pas d'iframe, pas d'attribut event.
 */
function sanitizeHtml(html: string): string {
  // Retire les balises script, iframe, object, embed, link, style, meta
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<(object|embed|link|meta|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(object|embed|link|meta)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "") // onclick, onload, etc.
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

/**
 * Fixture pour mode démo (pas de clé Mistral configurée).
 * Permet de présenter l'UI complète sans dépendance externe.
 */
function buildDemoFixture(args: GeneratePhishingArgs): GeneratedPhishing {
  const fixtures: Record<GeneratePhishingArgs["template"], GeneratedPhishing> = {
    "fake-microsoft": {
      subject: "[Action requise] Votre boite Office 365 sera désactivée",
      fromName: "Microsoft Office Support",
      fromEmail: "support@microsoft365-account.example",
      bodyText: `Bonjour,

Notre système a détecté une activité inhabituelle sur votre compte Office 365.
Pour eviter la suspension de votre boite mail dans 24h, merci de confirmer votre identité.

Cliquez ici : https://login.microsoft365-secure.example/verify

Cordialement,
L'équipe Microsoft 365`,
      bodyHtml: `<p>Bonjour,</p><p>Notre système a détecté une activité inhabituelle sur votre compte Office 365. Pour eviter la suspension de votre boîte mail dans 24h, merci de <strong>confirmer votre identité</strong>.</p><p><a href="https://login.microsoft365-secure.example/verify">Cliquez ici pour vérifier</a></p><p>Cordialement,<br>L'équipe Microsoft 365</p>`,
      redFlags: [
        "Domaine expéditeur 'microsoft365-account.example' au lieu de microsoft.com",
        "URL 'microsoft365-secure.example' suspecte (pas un sous-domaine officiel)",
        "Urgence artificielle ('24h')",
        "Faute d'accent sur 'eviter'",
        "Ton générique impersonnel",
      ],
    },
    "fake-fournisseur": {
      subject: "Mise à jour RIB urgente - Facture en attente",
      fromName: "Service Comptable",
      fromEmail: "compta@fournisseur-electricite.test",
      bodyText: `Bonjour,

Suite à un changement de banque, merci de mettre à jour notre RIB pour le règlement de votre facture en cours.

Nouveau IBAN : FR76 1234 5678 9012 3456 7890 123
BIC : XXXXXFRPP

Le règlement doit être effectué avant vendredi pour éviter une suspension de service.

Cordialement,
Le Service Compta`,
      bodyHtml: `<p>Bonjour,</p><p>Suite à un changement de banque, merci de mettre à jour notre RIB pour le règlement de votre facture en cours.</p><p><strong>Nouveau IBAN :</strong> FR76 1234 5678 9012 3456 7890 123<br><strong>BIC :</strong> XXXXXFRPP</p><p>Le règlement doit être effectué <strong>avant vendredi</strong> pour éviter une suspension de service.</p><p>Cordialement,<br>Le Service Compta</p>`,
      redFlags: [
        "Demande de changement de RIB par mail (jamais légitime sans validation orale)",
        "Urgence artificielle ('avant vendredi')",
        "Domaine fournisseur en .test (pas de vrai TLD pro)",
        "Aucune signature nominative, juste 'Le Service Compta'",
      ],
    },
    "fake-rh": {
      subject: "[RH] Mise à jour bancaire pour la paie de mai",
      fromName: "Service RH",
      fromEmail: "rh@entreprise-paie.example",
      bodyText: `Bonjour,

Pour préparer la paie de mai, merci de confirmer ou mettre à jour vos coordonnées bancaires via le lien ci-dessous.

https://rh-portal.entreprise-paie.example/paie-mai

Délai : 48h pour éviter un retard de versement.

Le service RH`,
      bodyHtml: `<p>Bonjour,</p><p>Pour préparer la paie de mai, merci de confirmer ou mettre à jour vos coordonnées bancaires via le lien ci-dessous.</p><p><a href="https://rh-portal.entreprise-paie.example/paie-mai">Mettre à jour mes coordonnées bancaires</a></p><p>Délai : <strong>48h</strong> pour éviter un retard de versement.</p><p>Le service RH</p>`,
      redFlags: [
        "Domaine externe ('entreprise-paie.example') alors que la RH est interne",
        "Lien direct vers un portail externe au lieu de l'intranet RH habituel",
        "Pression temporelle artificielle (48h)",
        "Aucune signature individuelle (pas de nom de gestionnaire RH)",
      ],
    },
    "fake-banque": {
      subject: "Tentative de connexion suspecte sur votre compte",
      fromName: "BanquePro Sécurité",
      fromEmail: "securite@banquepro-alerte.example",
      bodyText: `Cher client,

Nous avons détecté une tentative de connexion à votre espace pro depuis un appareil inconnu.
Si ce n'était pas vous, sécurisez votre compte immédiatement.

Lien sécurisé : https://banquepro-alerte.example/secure

L'équipe Sécurité`,
      bodyHtml: `<p>Cher client,</p><p>Nous avons détecté une tentative de connexion à votre espace pro depuis un appareil inconnu.</p><p><strong>Si ce n'était pas vous, sécurisez votre compte immédiatement.</strong></p><p><a href="https://banquepro-alerte.example/secure">Lien sécurisé →</a></p><p>L'équipe Sécurité</p>`,
      redFlags: [
        "Pas de mention du nom du destinataire (banque vous appelle par votre nom)",
        "Domaine 'banquepro-alerte.example' au lieu du domaine officiel",
        "Création de panique, pousse au clic immédiat",
        "Pas de numéro de téléphone client habituel rappelé",
      ],
    },
    "fake-livreur": {
      subject: "Votre colis est en attente - frais douane 1,98 €",
      fromName: "Colissimo Livraison",
      fromEmail: "info@colissimo-suivi.test",
      bodyText: `Bonjour,

Votre colis n° CY1234567FR est bloqué en douane.
Pour finaliser la livraison, merci de régler les frais : 1,98 €.

https://colissimo-suivi.test/payer

Sans paiement sous 48h, le colis sera renvoyé.`,
      bodyHtml: `<p>Bonjour,</p><p>Votre colis n° <strong>CY1234567FR</strong> est bloqué en douane.</p><p>Pour finaliser la livraison, merci de régler les frais : <strong>1,98 €</strong>.</p><p><a href="https://colissimo-suivi.test/payer">Régler les frais et débloquer le colis →</a></p><p>Sans paiement sous 48h, le colis sera renvoyé.</p>`,
      redFlags: [
        "Frais minuscules (1,98 €) pour ne pas méfier — le but est d'obtenir la CB",
        "Domaine '.test' factice",
        "Numéro de colis fictif (vous n'attendez peut-être pas de colis)",
        "Pression temporelle (48h)",
        "Colissimo officiel ne demande JAMAIS de paiement de douane par mail",
      ],
    },
    free: {
      subject: "Action requise — vérifiez votre compte",
      fromName: "Service Client",
      fromEmail: "noreply@service-client.example",
      bodyText: `Bonjour,\n\nUne vérification est requise sur votre compte. Cliquez ici pour la finaliser : https://verify.example.test/login\n\nCordialement.`,
      bodyHtml: `<p>Bonjour,</p><p>Une vérification est requise sur votre compte. <a href="https://verify.example.test/login">Cliquez ici pour la finaliser</a>.</p><p>Cordialement.</p>`,
      redFlags: [
        "Mail générique sans contexte précis",
        "URL non identifiable",
        "Pas de signature humaine",
      ],
    },
  };
  return fixtures[args.template];
}
