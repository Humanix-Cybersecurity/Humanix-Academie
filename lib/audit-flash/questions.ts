// SPDX-License-Identifier: AGPL-3.0-or-later
// Catalogue des 15 questions de l'audit flash cyber HumaniX.
// Format : OUI / NON / JE NE SAIS PAS (équivalent NON pour le score).
// Chaque question est ponderee selon sa criticite cyber et son impact NIS2/RGPD.
//
// Les categories alimentent l'analyse des "Top 3 risques" dans le rapport PDF.

export type AuditCategory =
  | "identite" // MFA, mots de passe, comptes admin
  | "donnees" // sauvegardes, chiffrement, RGPD
  | "humain" // sensibilisation, phishing, gouvernance
  | "infra" // mises a jour, antivirus, reseau
  | "conformite"; // NIS2, registre, plan de reponse

export type AuditQuestion = {
  id: string;
  category: AuditCategory;
  text: string;
  // Quand l'utilisateur repond OUI = bon point pour la cyber.
  // Quand il repond NON ou ne sait pas = risque.
  // Inverse a true si la formulation est negative (rare).
  invertScoring?: boolean;
  // Poids de la question (1 a 3). Plus c'est lourd, plus ca penalise.
  weight: 1 | 2 | 3;
  // Aide contextuelle affichee sous la question.
  hint?: string;
};

export const AUDIT_QUESTIONS: AuditQuestion[] = [
  // ====== IDENTITE ======
  {
    id: "mfa_admins",
    category: "identite",
    text: "L'authentification à deux facteurs (MFA) est-elle activée pour tous vos comptes administrateurs (Microsoft 365, Google Workspace, hébergeur, banque) ?",
    weight: 3,
    hint: "Le MFA bloque 99 % des compromissions de comptes selon Microsoft.",
  },
  {
    id: "mfa_users",
    category: "identite",
    text: "Le MFA est-il activé pour TOUS vos collaborateurs, pas uniquement les administrateurs ?",
    weight: 2,
    hint: "Un seul compte sans MFA suffit à compromettre l'entreprise.",
  },
  {
    id: "password_manager",
    category: "identite",
    text: "Vos collaborateurs utilisent-ils un gestionnaire de mots de passe (Bitwarden, 1Password, Dashlane…) plutôt qu'un fichier Excel ou des post-it ?",
    weight: 2,
  },

  // ====== DONNEES ======
  {
    id: "backups_offline",
    category: "donnees",
    text: "Vos sauvegardes sont-elles stockées hors-ligne ou sur un site distinct (règle 3-2-1) ET testées au moins une fois par an ?",
    weight: 3,
    hint: "Une sauvegarde non-testée n'est pas une sauvegarde.",
  },
  {
    id: "rgpd_register",
    category: "donnees",
    text: "Possédez-vous un registre des traitements RGPD à jour (ou un DPO/référent désigné) ?",
    weight: 2,
  },
  {
    id: "data_inventory",
    category: "donnees",
    text: "Savez-vous précisément quelles données sensibles vous détenez (clients, RH, santé) et où elles sont stockées ?",
    weight: 2,
  },

  // ====== HUMAIN ======
  {
    id: "training_yearly",
    category: "humain",
    text: "Vos collaborateurs ont-ils suivi une formation cybersécurité au cours des 12 derniers mois ?",
    weight: 3,
    hint: "60 % des cyberattaques exploitent une erreur humaine (ANSSI).",
  },
  {
    id: "phishing_test",
    category: "humain",
    text: "Avez-vous déjà testé vos collaborateurs avec une simulation de phishing ?",
    weight: 2,
  },
  {
    id: "onboarding_security",
    category: "humain",
    text: "Vos nouveaux arrivants reçoivent-ils une sensibilisation cyber dès leur intégration ?",
    weight: 1,
  },

  // ====== INFRA ======
  {
    id: "updates_auto",
    category: "infra",
    text: "Les mises à jour de sécurité (Windows, macOS, navigateur, antivirus) sont-elles appliquées automatiquement sur tous les postes ?",
    weight: 2,
  },
  {
    id: "edr_antivirus",
    category: "infra",
    text: "Disposez-vous d'un antivirus moderne (EDR / XDR) sur l'ensemble du parc (et pas uniquement Windows Defender par défaut) ?",
    weight: 2,
  },
  {
    id: "byod_policy",
    category: "infra",
    text: "Avez-vous une règle claire pour les appareils personnels (BYOD) qui accèdent aux données pro ?",
    weight: 1,
  },

  // ====== CONFORMITE ======
  {
    id: "incident_plan",
    category: "conformite",
    text: "Disposez-vous d'un plan de réponse à incident écrit (qui contacter, dans quel ordre, sous combien d'heures) ?",
    weight: 3,
    hint: "NIS2 impose 24h pour notifier l'ANSSI en cas d'incident significatif.",
  },
  {
    id: "nis2_aware",
    category: "conformite",
    text: "Savez-vous si votre entreprise est concernée par la directive NIS2 (entrée en vigueur en France) ?",
    weight: 2,
    hint: "NIS2 concerne ~15 000 entités en France, dont de nombreuses PME (santé, énergie, eau, transport, sous-traitants…).",
  },
  {
    id: "cyber_insurance",
    category: "conformite",
    text: "Avez-vous souscrit une assurance cyber (ou évalué votre exposition financière en cas d'attaque) ?",
    weight: 1,
  },
];

export const TOTAL_MAX_SCORE = AUDIT_QUESTIONS.reduce(
  (sum, q) => sum + q.weight,
  0,
);

export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  identite: "Gestion des identités",
  donnees: "Protection des données",
  humain: "Facteur humain",
  infra: "Infrastructure & poste de travail",
  conformite: "Conformité NIS2 / RGPD",
};

export const CATEGORY_EMOJI: Record<AuditCategory, string> = {
  identite: "🔐",
  donnees: "💾",
  humain: "🧑‍💼",
  infra: "💻",
  conformite: "📋",
};
