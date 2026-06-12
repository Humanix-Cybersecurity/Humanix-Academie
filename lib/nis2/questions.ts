// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Catalogue des 30 questions du diagnostic NIS2 (Pack NIS2 v2, mai 2026).
//
// Format : OUI / NON / JE NE SAIS PAS (= NON pour le score).
// Chaque question est mappee a un article precis de la directive NIS2
// (transposee en droit francais par la loi du 31 octobre 2024) pour
// produire un score per-article.
//
// SOURCES :
//   - Directive (UE) 2022/2555 du Parlement europeen, articles 21 et 23
//   - Loi francaise du 31 octobre 2024 (n° 2024-1039), art. L.1332-1 et s.
//   - ANSSI, "Mesures de cyber-securite NIS2", guide du 15 janvier 2025
//   - Mapping CISO Assistant :
//     connectors/ciso-assistant-frameworks/mapping-humanix-awareness-
//     to-nis2-directive.yaml
//
// PERIMETRE :
//   30 questions sur 11 axes (articles 21.2.a a 21.2.j + art. 23).
//   Volume conforme a la recommandation ANSSI "diagnostic 30 min max".

import type { Nis2Article } from "./articles";

export type Nis2Question = {
  id: string;
  /** Article NIS2 concerne (URN court : 21.2.a, 21.2.b, etc.) */
  article: Nis2Article;
  text: string;
  /** Poids 1-3 : plus c'est lourd, plus ca penalise un NON */
  weight: 1 | 2 | 3;
  /** Aide contextuelle (norme, exemple, definition) */
  hint?: string;
};

export const NIS2_QUESTIONS: Nis2Question[] = [
  // ============================================================
  // ART. 21.2.a - Politiques d'analyse des risques et SI
  // ============================================================
  {
    id: "risk_policy_written",
    article: "21.2.a",
    text: "Votre organisation dispose-t-elle d'une politique cybersécurité écrite, signée par la direction et révisée au moins une fois par an ?",
    weight: 3,
    hint: "Article 21.2.a NIS2. La politique doit couvrir : périmètre, gouvernance, gestion des risques, plan de continuité.",
  },
  {
    id: "risk_analysis_done",
    article: "21.2.a",
    text: "Avez-vous mené une analyse des risques cyber (type EBIOS RM, ISO 27005 ou simplifiée) dans les 24 derniers mois ?",
    weight: 2,
    hint: "Inventaire des actifs critiques + scénarios de menace + plan de traitement.",
  },
  {
    id: "asset_inventory",
    article: "21.2.a",
    text: "Maintenez-vous un inventaire à jour des systèmes d'information critiques (serveurs, applications SaaS, données sensibles) ?",
    weight: 2,
    hint: "Sans inventaire, impossible d'évaluer le risque. CMDB ou tableau Excel suffit en PME.",
  },

  // ============================================================
  // ART. 21.2.b - Gestion des incidents
  // ============================================================
  {
    id: "incident_procedure",
    article: "21.2.b",
    text: "Avez-vous une procédure écrite de gestion des incidents (détection, qualification, escalade, contention, rétablissement) ?",
    weight: 3,
    hint: "Article 21.2.b NIS2. La procédure doit nommer qui contacte qui à chaque étape.",
  },
  {
    id: "incident_drill",
    article: "21.2.b",
    text: "Avez-vous réalisé au moins UN exercice de simulation d'incident (table-top, scénario rançongiciel) dans les 12 derniers mois ?",
    weight: 2,
    hint: "Un plan jamais testé reste théorique. L'ANSSI recommande 1 exercice annuel minimum.",
  },
  {
    id: "incident_log",
    article: "21.2.b",
    text: "Centralisez-vous les logs critiques (auth, accès admin, alertes EDR) pour pouvoir investiguer après incident ?",
    weight: 2,
    hint: "Retention minimum 6 mois recommandée. SIEM open source possibles (Sekoia, Wazuh).",
  },

  // ============================================================
  // ART. 21.2.c - Continuité d'activité + sauvegardes
  // ============================================================
  {
    id: "backup_321",
    article: "21.2.c",
    text: "Vos sauvegardes respectent-elles la règle 3-2-1 (3 copies, 2 supports différents, 1 hors-site) ?",
    weight: 3,
    hint: "Article 21.2.c NIS2. La règle 3-2-1 est le standard ANSSI / NIST anti-rançongiciel.",
  },
  {
    id: "backup_restore_test",
    article: "21.2.c",
    text: "Testez-vous la restauration de vos sauvegardes au moins une fois par trimestre ?",
    weight: 2,
    hint: "Une sauvegarde non testée n'est PAS une sauvegarde. Beaucoup d'organisations le découvrent trop tard.",
  },
  {
    id: "backup_immutable",
    article: "21.2.c",
    text: "Au moins UNE de vos sauvegardes est-elle immuable / déconnectée du réseau (anti-rançongiciel) ?",
    weight: 3,
    hint: "WORM, S3 Object Lock, bandes hors-ligne. Si toutes les sauvegardes sont online, un rançongiciel les chiffre aussi.",
  },

  // ============================================================
  // ART. 21.2.d - Sécurité de la chaîne d'approvisionnement
  // ============================================================
  {
    id: "supplier_inventory",
    article: "21.2.d",
    text: "Maintenez-vous une liste à jour de vos sous-traitants IT critiques (hébergeur, infogéreur, SaaS métier) avec leur niveau de criticité ?",
    weight: 2,
    hint: "Article 21.2.d NIS2. RGPD art. 28 impose déjà cet inventaire pour les traitements de données.",
  },
  {
    id: "supplier_security_clause",
    article: "21.2.d",
    text: "Vos contrats avec ces sous-traitants incluent-ils des clauses sécurité explicites (notification d'incident, droit d'audit, certifications) ?",
    weight: 2,
    hint: "Sans clause, vous n'avez aucun levier juridique en cas d'incident chez eux.",
  },
  {
    id: "supplier_assessment",
    article: "21.2.d",
    text: "Évaluez-vous la posture cyber de vos nouveaux sous-traitants AVANT signature (questionnaire, ISO 27001, SecNumCloud) ?",
    weight: 2,
  },

  // ============================================================
  // ART. 21.2.e - Sécurité acquisition / dev / maintenance
  // ============================================================
  {
    id: "patch_management",
    article: "21.2.e",
    text: "Avez-vous un processus de gestion des correctifs de sécurité (patch management) avec un SLA défini ?",
    weight: 3,
    hint: "Article 21.2.e NIS2. ANSSI recommande : critiques < 7j, hauts < 30j, autres < 90j.",
  },
  {
    id: "vulnerability_scan",
    article: "21.2.e",
    text: "Scannez-vous régulièrement vos systèmes pour détecter les vulnérabilités (mensuel ou trimestriel selon criticité) ?",
    weight: 2,
    hint: "Outils gratuits : OpenVAS, Trivy pour les containers, Snyk pour les dépendances.",
  },

  // ============================================================
  // ART. 21.2.f - Politiques d'évaluation de l'efficacité
  // ============================================================
  {
    id: "internal_audit",
    article: "21.2.f",
    text: "Réalisez-vous au moins un audit interne de votre dispositif cyber par an (auto-évaluation ou cabinet externe) ?",
    weight: 2,
    hint: "Article 21.2.f NIS2. Pour les PME : auto-audit avec grille publique (ANSSI guide 42 mesures).",
  },
  {
    id: "kpi_tracking",
    article: "21.2.f",
    text: "Suivez-vous des indicateurs cyber au comité de direction (taux de couverture MFA, incidents, modules de formation) ?",
    weight: 1,
  },

  // ============================================================
  // ART. 21.2.g - Cyber-hygiène + sensibilisation
  // ============================================================
  {
    id: "training_program",
    article: "21.2.g",
    text: "Avez-vous un programme de sensibilisation cyber pour TOUS vos collaborateurs (pas seulement IT) ?",
    weight: 3,
    hint: "Article 21.2.g NIS2 - explicite sur la formation OBLIGATOIRE de l'ensemble du personnel.",
  },
  {
    id: "phishing_simulation",
    article: "21.2.g",
    text: "Lancez-vous des campagnes de phishing simulées au moins 2 fois par an pour mesurer le réflexe de vos équipes ?",
    weight: 2,
    hint: "Mesure tangible exigée par les assureurs cyber et les auditeurs.",
  },
  {
    id: "training_directors",
    article: "21.2.g",
    text: "Vos dirigeants (COMEX, CODIR) ont-ils suivi une formation cyber spécifique à leur niveau dans les 24 derniers mois ?",
    weight: 3,
    hint: "Article 20 NIS2 - formation des dirigeants OBLIGATOIRE et imposable juridiquement.",
  },

  // ============================================================
  // ART. 21.2.h - Cryptographie + chiffrement
  // ============================================================
  {
    id: "encryption_at_rest",
    article: "21.2.h",
    text: "Vos données sensibles (RH, finance, clients) sont-elles chiffrées au repos (disques, bases de données, sauvegardes) ?",
    weight: 2,
    hint: "Article 21.2.h NIS2. AES-256 standard. Activable nativement sur PostgreSQL, S3, BitLocker.",
  },
  {
    id: "encryption_in_transit",
    article: "21.2.h",
    text: "Toutes les communications externes (mails, web, API) utilisent-elles TLS 1.2+ (HTTPS systématique, plus de SMTP en clair) ?",
    weight: 2,
  },

  // ============================================================
  // ART. 21.2.i - Sécurité RH (départs, accès)
  // ============================================================
  {
    id: "offboarding_procedure",
    article: "21.2.i",
    text: "Avez-vous une procédure de départ employé qui révoque AUTOMATIQUEMENT tous les accès dans les 24h ?",
    weight: 3,
    hint: "Article 21.2.i NIS2. 30 % des fuites de données viennent d'ex-collaborateurs avec des accès résiduels (CESIN 2024).",
  },
  {
    id: "least_privilege",
    article: "21.2.i",
    text: "Appliquez-vous le principe du moindre privilège (chaque collaborateur a accès UNIQUEMENT à ce dont il a besoin) ?",
    weight: 2,
  },
  {
    id: "admin_separation",
    article: "21.2.i",
    text: "Vos administrateurs ont-ils des comptes séparés (compte utilisateur courant ≠ compte admin) ?",
    weight: 2,
    hint: "Recommandation ANSSI hygiène n°37. Évite qu'un phishing sur l'admin = compromission totale.",
  },

  // ============================================================
  // ART. 21.2.j - MFA et authentification
  // ============================================================
  {
    id: "mfa_admins",
    article: "21.2.j",
    text: "Le MFA est-il activé pour TOUS vos comptes administrateurs (M365, Google, hébergeur, banque) ?",
    weight: 3,
    hint: "Article 21.2.j NIS2. Microsoft : MFA bloque 99,9 % des compromissions de compte.",
  },
  {
    id: "mfa_users",
    article: "21.2.j",
    text: "Le MFA est-il activé pour TOUS vos collaborateurs, pas uniquement les administrateurs ?",
    weight: 2,
    hint: "Un seul compte non-MFA = brèche potentielle pour toute l'organisation.",
  },
  {
    id: "mfa_phishing_resistant",
    article: "21.2.j",
    text: "Utilisez-vous un MFA résistant au phishing (passkey, FIDO2, app authenticator) plutôt que SMS ?",
    weight: 2,
    hint: "Le MFA SMS est contournable par SIM swap. ANSSI recommande FIDO2 ou OTP app.",
  },

  // ============================================================
  // ART. 23 - Notification d'incident à l'autorité
  // ============================================================
  {
    id: "notification_24h",
    article: "23",
    text: "Savez-vous QUI doit prévenir QUI et dans quels délais en cas d'incident majeur (alerte précoce 24h, notification 72h) ?",
    weight: 3,
    hint: "Article 23 NIS2. ANSSI = autorité de notification en France. Format = MISP-compatible (cf. cert.ssi.gouv.fr).",
  },
  {
    id: "incident_report_template",
    article: "23",
    text: "Avez-vous un modèle de rapport d'incident pré-rempli (qui, quoi, quand, périmètre, mesures prises) ?",
    weight: 2,
    hint: "À préparer à froid. L'avoir au moment où ça brûle évite de perdre les délais.",
  },
  {
    id: "press_contact",
    article: "23",
    text: "Avez-vous identifié un référent communication de crise (interne ou externe) à contacter en cas d'incident public ?",
    weight: 1,
    hint: "Pas obligatoire NIS2 mais conditionne souvent l'image post-incident.",
  },
];

/** Sanity check : on a bien 30 questions */
if (NIS2_QUESTIONS.length !== 30) {
  throw new Error(
    `NIS2 questionnaire doit contenir exactement 30 questions, trouve ${NIS2_QUESTIONS.length}`,
  );
}
