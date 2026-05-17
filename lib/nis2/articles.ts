// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Catalogue des articles NIS2 couverts par le diagnostic et le mapping
// Humanix. Aligne sur le mapping CISO Assistant :
//   connectors/ciso-assistant-frameworks/mapping-humanix-awareness-to-nis2-directive.yaml
//
// Source : Directive (UE) 2022/2555, transposee FR loi 2024-1039 du 31/10/2024.

export type Nis2Article =
  | "21.2.a"
  | "21.2.b"
  | "21.2.c"
  | "21.2.d"
  | "21.2.e"
  | "21.2.f"
  | "21.2.g"
  | "21.2.h"
  | "21.2.i"
  | "21.2.j"
  | "23";

export type Nis2ArticleMeta = {
  id: Nis2Article;
  /** Titre court pour affichage UI */
  title: string;
  /** Description complete pour PDF / rapport */
  description: string;
  /** Slugs de saisons Humanix qui couvrent cet article (cf. mapping YAML) */
  coveredBySaisons: string[];
};

export const NIS2_ARTICLES: Record<Nis2Article, Nis2ArticleMeta> = {
  "21.2.a": {
    id: "21.2.a",
    title: "Politiques d'analyse des risques et SI",
    description:
      "Mise en place de politiques relatives à l'analyse des risques et à la sécurité des systèmes d'information.",
    coveredBySaisons: ["nis2-pme", "donnees-sensibles"],
  },
  "21.2.b": {
    id: "21.2.b",
    title: "Gestion des incidents",
    description:
      "Mesures de gestion des incidents (détection, qualification, escalade, contention, communication, rétablissement, retour d'expérience).",
    coveredBySaisons: ["crise-cyber", "remediation-flash"],
  },
  "21.2.c": {
    id: "21.2.c",
    title: "Continuité d'activité + sauvegardes",
    description:
      "Continuité des activités, comme la gestion des sauvegardes et la reprise après sinistre.",
    coveredBySaisons: ["ransomware", "sauvegardes"],
  },
  "21.2.d": {
    id: "21.2.d",
    title: "Sécurité chaîne d'approvisionnement",
    description:
      "Sécurité de la chaîne d'approvisionnement, y compris les aspects liés aux relations entre chaque entité et ses fournisseurs ou prestataires.",
    coveredBySaisons: ["supply-chain"],
  },
  "21.2.e": {
    id: "21.2.e",
    title: "Sécurité acquisition / dev / maintenance",
    description:
      "Sécurité de l'acquisition, du développement et de la maintenance des systèmes d'information, y compris la gestion des vulnérabilités.",
    coveredBySaisons: ["cyber-dev"],
  },
  "21.2.f": {
    id: "21.2.f",
    title: "Politiques d'évaluation de l'efficacité",
    description:
      "Politiques et procédures pour évaluer l'efficacité des mesures de gestion des risques en cybersécurité.",
    coveredBySaisons: ["nis2-pme"],
  },
  "21.2.g": {
    id: "21.2.g",
    title: "Cyber-hygiène + formation",
    description:
      "Pratiques d'hygiène cybernétique de base et formation à la cybersécurité (TOUS les collaborateurs, dirigeants inclus).",
    coveredBySaisons: [
      "phishing",
      "mots-de-passe",
      "email-pro",
      "teletravail",
      "cyber-dirigeants",
      "fraude-president",
      "deepfakes",
      "ia-generative",
    ],
  },
  "21.2.h": {
    id: "21.2.h",
    title: "Cryptographie + chiffrement",
    description:
      "Politiques et procédures relatives à l'utilisation de la cryptographie et, le cas échéant, du chiffrement.",
    coveredBySaisons: ["donnees-sensibles", "stockage-cloud"],
  },
  "21.2.i": {
    id: "21.2.i",
    title: "Sécurité RH + contrôle d'accès",
    description:
      "Sécurité des ressources humaines, politiques de contrôle d'accès et gestion des actifs.",
    coveredBySaisons: ["cyber-rh", "acces-physiques"],
  },
  "21.2.j": {
    id: "21.2.j",
    title: "MFA + authentification",
    description:
      "Utilisation de solutions d'authentification à plusieurs facteurs ou continue, communications sécurisées (voix, vidéo, texte) et systèmes de communication d'urgence sécurisés.",
    coveredBySaisons: ["mots-de-passe", "visios-meetings"],
  },
  "23": {
    id: "23",
    title: "Notification d'incident à l'autorité",
    description:
      "Obligation de notifier au CSIRT compétent (ANSSI en France) tout incident ayant un impact important : alerte précoce sous 24h, notification d'incident sous 72h, rapport final sous 1 mois.",
    coveredBySaisons: ["crise-cyber"],
  },
};

export const NIS2_ARTICLES_ORDER: Nis2Article[] = [
  "21.2.a",
  "21.2.b",
  "21.2.c",
  "21.2.d",
  "21.2.e",
  "21.2.f",
  "21.2.g",
  "21.2.h",
  "21.2.i",
  "21.2.j",
  "23",
];
