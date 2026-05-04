// Catalogue des evenements webhook.
// Source de verite : ce fichier.
// Une feature qui veut envoyer un webhook DOIT etre listee ici.

export const WEBHOOK_EVENTS = {
  "episode.completed": {
    label: "Un collaborateur termine un module",
    description: "Envoye quand un user passe un episode au statut COMPLETED.",
    sample: {
      userName: "Alice Martin",
      userEmail: "alice@acme.fr",
      saisonTitle: "Saison 1 — Phishing",
      episodeTitle: "Reconnaitre un faux mail Microsoft",
      score: 92,
      bestScore: 92,
    },
  },
  "saison.completed": {
    label: "Un collaborateur termine une saison entière",
    description:
      "Envoye quand un user a complete tous les episodes d'une saison. Idempotent : 1 seul envoi par (user, saison).",
    sample: {
      userName: "Alice Martin",
      saisonTitle: "Saison 1 — Phishing",
      averageScore: 87,
      familyInvitesUnlocked: 3,
    },
  },
  "phishing.campaign_completed": {
    label: "Une campagne phishing simulé est terminée",
    description:
      "Envoye quand le delai d'expiration d'une campagne est atteint. Resume : envoyes / cliques / signales.",
    sample: {
      campaignTitle: "Faux Microsoft 365 — Mai 2026",
      sentTo: 42,
      clicked: 6,
      reported: 18,
      reportRate: 0.43,
    },
  },
  "phishing.reported": {
    label: "Un mail suspect a été signalé",
    description:
      "Envoye quand un utilisateur signale un mail comme phishing (depuis l'add-in Outlook ou en interne). Le canal Slack/Teams reçoit l'alerte en temps reel — utile pour le SOC ou l'IT.",
    sample: {
      userName: "Alice Martin",
      fromAddress: "noreply@suspect.example",
      subject: "[ACTION REQUISE] Verifiez votre compte",
      source: "outlook-addin",
    },
  },
  "risk.degraded": {
    label: "Le score de risque collectif s'est dégradé",
    description:
      "Declenche quand le score collectif baisse de >= 5 points en 7 jours (signal d'alerte).",
    sample: {
      previousScore: 72,
      currentScore: 64,
      delta: -8,
      cause: "3 utilisateurs inactifs > 30j",
    },
  },
  "user.invited": {
    label: "Un nouvel utilisateur a été invité",
    description:
      "Envoye lors de l'envoi d'un mail magique-link a un nouvel arrivant.",
    sample: {
      email: "bob@acme.fr",
      invitedBy: "Charles Admin",
    },
  },
  "marketplace.module_installed": {
    label: "Un module marketplace a été installé",
    description: "Envoye quand un admin installe un module communautaire.",
    sample: {
      moduleTitle: "Rancongiciels — comprendre, eviter, reagir",
      author: "Pierre Dupont (RSSI@CHU Cherbourg)",
      installedBy: "Charles Admin",
    },
  },
  "evidence.exported": {
    label: "Un export de preuves de conformité a été généré",
    description:
      "Envoyé à chaque appel réussi de /api/v1/evidence-export. Permet à votre GRC ou SOC de savoir qu'un nouveau bundle est disponible (sans avoir à interroger en polling).",
    sample: {
      framework: "ISO27001:2022",
      format: "oscal-v1",
      controls_count: 7,
      summary: { compliant: 5, partial: 1, non_compliant: 1 },
      bundle_url:
        "https://academie.humanix-cybersecurity.fr/api/v1/evidence-export?framework=ISO27001:2022&format=oscal-v1",
      generated_at: "2026-05-03T14:23:45Z",
    },
  },
} as const;

export type WebhookEventKey = keyof typeof WEBHOOK_EVENTS;

export const ALL_WEBHOOK_EVENTS = Object.keys(
  WEBHOOK_EVENTS,
) as WebhookEventKey[];

export function isWebhookEventKey(value: string): value is WebhookEventKey {
  return value in WEBHOOK_EVENTS;
}

/**
 * Parse le champ events (CSV) d'un TenantWebhook en set typé.
 */
export function parseSubscribedEvents(csv: string): Set<WebhookEventKey> {
  return new Set(
    csv
      .split(",")
      .map((s) => s.trim())
      .filter(isWebhookEventKey),
  );
}

/**
 * Serialise un set d'evenements en CSV (stockage Prisma).
 */
export function serializeEvents(events: Iterable<WebhookEventKey>): string {
  return Array.from(events).join(",");
}
