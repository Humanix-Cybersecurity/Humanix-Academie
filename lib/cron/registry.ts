// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Catalogue des taches planifiees (#749).
//
// C'est la contrepartie EXECUTABLE de docs/CRON.md : le tableau markdown
// dit a l'operateur ce qu'il doit planifier, ce fichier permet a l'app de
// verifier que ca tourne vraiment.
//
// `expectedEveryHours` sert a decider si un cron est en retard. On tolere
// un large facteur (cf. STALE_FACTOR dans health.ts) : le but est de
// reperer un cron MORT, pas de rale parce qu'il a 10 minutes de retard.
//
// AJOUTER UN CRON : l'inscrire ICI **et** dans docs/CRON.md **et** dans
// infra/ofelia/config.ini. Les trois doivent rester alignes - c'est
// exactement ce triple oubli qui a laissé `exposure-scan` ne jamais
// tourner, et phishing-drip silencieux (#733).

export type CronCriticality = "high" | "normal";

export type CronDefinition = {
  /** Slug = segment d'URL sous /api/cron/ et valeur de CronRun.name. */
  slug: string;
  label: string;
  /** Cadence attendue, en heures (168 = hebdomadaire). */
  expectedEveryHours: number;
  /** high = son silence casse une fonctionnalite visible. */
  criticality: CronCriticality;
  description: string;
};

export const CRON_REGISTRY: CronDefinition[] = [
  {
    slug: "risk-snapshot",
    label: "Snapshot de risque",
    expectedEveryHours: 24,
    criticality: "high",
    description:
      "Photo quotidienne du score de risque par tenant (alimente /admin/analytics/forecast).",
  },
  {
    slug: "data-retention-purge",
    label: "Purge RGPD",
    expectedEveryHours: 24,
    criticality: "high",
    description:
      "Anonymise les users inactifs et purge events/audit-logs au-delà du seuil du tenant.",
  },
  {
    slug: "cyber-event-tick",
    label: "Événements cyber",
    expectedEveryHours: 24,
    criticality: "high",
    description:
      "Crée/active les CyberEventInstance (Cybermois, World Password Day…).",
  },
  {
    slug: "achievements-reevaluate",
    label: "Badges + relances obligatoires",
    expectedEveryHours: 24,
    criticality: "normal",
    description:
      "Rattrape les badges ratés à la volée et émet les notifications de saisons obligatoires.",
  },
  {
    slug: "challenge-rewards",
    label: "Récompenses challenge",
    expectedEveryHours: 24,
    criticality: "high",
    description:
      "Distribue coins/items aux gagnants des TeamChallenge terminés.",
  },
  {
    slug: "phishing-launch",
    label: "Lancement campagnes phishing",
    expectedEveryHours: 1,
    criticality: "high",
    description: "Démarre les campagnes dont scheduledAt est dans le passé.",
  },
  {
    slug: "phishing-drip",
    label: "Envoi drippé phishing",
    expectedEveryHours: 1,
    criticality: "high",
    description:
      "Envoie les mails drip-planifiés arrivés à échéance. Son silence = mails jamais partis (#733).",
  },
  {
    slug: "breaches-refresh",
    label: "Observatoire des fuites",
    expectedEveryHours: 6,
    criticality: "normal",
    description: "Scrape les sources publiques de fuites (/cyber-meteo).",
  },
  {
    slug: "weekly-anecdote",
    label: "Cyber-Anecdote du lundi",
    expectedEveryHours: 168,
    criticality: "normal",
    description: "Envoie l'anecdote hebdomadaire aux abonnés.",
  },
  {
    slug: "audit-logs-purge",
    label: "Purge des journaux d'audit",
    expectedEveryHours: 24,
    criticality: "normal",
    description: "Filet global : purge AuditLog > 400 j (CNIL ~13 mois).",
  },
  {
    slug: "exposure-scan",
    label: "Veille d'exposition B2B",
    expectedEveryHours: 24,
    criticality: "normal",
    description:
      "Détection des fuites touchant les domaines des tenants. Inerte si EXPOSURE_B2B_ENABLED != true.",
  },
];

export const CRON_BY_SLUG: Record<string, CronDefinition> = Object.fromEntries(
  CRON_REGISTRY.map((c) => [c.slug, c]),
);
