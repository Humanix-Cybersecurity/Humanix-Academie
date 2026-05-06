// SPDX-License-Identifier: AGPL-3.0-or-later
// Playbooks de reponse a incident par type, structures en 5 phases :
//
//   h0     - Action immediate (premiere heure)
//   h24    - 24 premieres heures (confinement, premiere notification)
//   h72    - 72 heures (notification CNIL/ANSSI obligatoire si requis)
//   w1     - Premiere semaine (resolution, communication)
//   retex  - Retour d'experience (apres cloture)
//
// Inspire des recommandations ANSSI ("Que faire en cas de cyberattaque ?")
// et CNIL (RGPD art. 33 - notification sous 72h en cas de violation de DCP).
//
// IMPORTANT : Ces playbooks sont des AIDES. Ils ne remplacent PAS l'avis
// d'un RSSI ou d'un cabinet specialise pour les incidents critiques.

import type { IncidentType } from "@prisma/client";

export type PlaybookAction = {
  phase: "h0" | "h24" | "h72" | "w1" | "retex";
  category:
    | "confinement"
    | "notification"
    | "communication"
    | "forensic"
    | "preuves"
    | "retex";
  title: string;
  description: string;
  documentSlug?: string; // Lien vers un template document genere
};

// ===========================================================================
// CHECKLIST COMMUNE A TOUS LES INCIDENTS
// ===========================================================================
const COMMON_H0: PlaybookAction[] = [
  {
    phase: "h0",
    category: "confinement",
    title: "Isoler les systèmes touchés du réseau",
    description:
      "Débrancher le câble réseau ou désactiver le Wi-Fi des postes/serveurs concernés. Ne PAS éteindre la machine - la mémoire vive contient des indices forensiques précieux.",
  },
  {
    phase: "h0",
    category: "preuves",
    title: "Préserver les preuves",
    description:
      "Ne rien supprimer, ne rien réinstaller. Photographier les écrans (ransom note, alertes), conserver les logs, faire un dump mémoire si possible (outil : DumpIt, FTK Imager).",
  },
  {
    phase: "h0",
    category: "communication",
    title: "Alerter la cellule de crise interne",
    description:
      "Informer le dirigeant, le DSI/RSSI, la DRH, le DAF. Si pas de cellule formalisée, réunir ces 4 personnes immédiatement (canal hors-ligne : téléphone, pas l'email compromis).",
  },
];

const COMMON_H24: PlaybookAction[] = [
  {
    phase: "h24",
    category: "communication",
    title: "Briefer les collaborateurs (sans paniquer)",
    description:
      "Communiquer un message factuel : ce qui s'est passé, ce qu'on demande aux équipes (ne plus utiliser X, changer son mot de passe, signaler un mail suspect…). Ne pas mentir, ne pas dramatiser.",
    documentSlug: "communication-interne",
  },
  {
    phase: "h24",
    category: "forensic",
    title: "Lancer l'investigation : périmètre et impact",
    description:
      "Identifier : depuis quand l'attaquant est dans le SI ? quels comptes/données touchés ? quel vecteur d'entrée ? Si l'équipe interne n'a pas les compétences, contacter un prestataire PRIS (liste ANSSI).",
  },
  {
    phase: "h24",
    category: "notification",
    title: "Vérifier l'obligation de notification CNIL (RGPD)",
    description:
      "Si l'incident a touché des données personnelles ET représente un risque pour les personnes : notification CNIL obligatoire sous 72h. Si risque élevé : information aux personnes concernées en plus.",
  },
];

const COMMON_H72: PlaybookAction[] = [
  {
    phase: "h72",
    category: "notification",
    title: "Notifier la CNIL si DCP touchées",
    description:
      "Téléservice CNIL : https://notifications.cnil.fr/notifications/index. Indiquer : nature de la violation, catégories de données, nombre de personnes, conséquences probables, mesures prises.",
    documentSlug: "notification-cnil",
  },
  {
    phase: "h72",
    category: "notification",
    title: "Notifier l'ANSSI si vous êtes sous NIS2",
    description:
      "Notification précoce sous 24h, notification d'incident sous 72h. Téléservice : https://www.cert.ssi.gouv.fr/incident/. Concerne : OSE, FSN, et entités essentielles/importantes NIS2.",
    documentSlug: "notification-anssi",
  },
  {
    phase: "h72",
    category: "preuves",
    title: "Déposer plainte au commissariat / gendarmerie",
    description:
      "Pour pouvoir faire jouer l'assurance cyber et préserver vos droits. Section cybercriminalité. Apporter : copie des traces, journaux, ransom note. Récupérer le récépissé.",
  },
];

const COMMON_W1: PlaybookAction[] = [
  {
    phase: "w1",
    category: "communication",
    title: "Communication externe (clients, partenaires, fournisseurs)",
    description:
      "Si l'incident a (ou pourrait avoir) un impact sur eux : email factuel, transparent, en français simple. Mentionner les actions correctives. Désigner UN seul porte-parole.",
    documentSlug: "communication-externe",
  },
  {
    phase: "w1",
    category: "confinement",
    title: "Restauration depuis sauvegardes propres",
    description:
      "Restaurer UNIQUEMENT depuis une sauvegarde antérieure à la compromission, ET hors-ligne. Avant restauration : changer TOUS les mots de passe, révoquer tous les tokens d'API, refaire les certificats.",
  },
  {
    phase: "w1",
    category: "forensic",
    title: "Compléter l'analyse forensique",
    description:
      "Identifier la cause racine (point d'entrée + propagation). Documenter dans le RetEx. Ce point est essentiel pour l'assurance et pour éviter une récidive.",
  },
];

const COMMON_RETEX: PlaybookAction[] = [
  {
    phase: "retex",
    category: "retex",
    title: "Réunion de retour d'expérience (RetEx)",
    description:
      "Sous 30 jours après résolution. Personnes : dirigeant, DSI/RSSI, métiers impactés, prestataire externe. Format : Qu'est-ce qui s'est bien passé ? Qu'est-ce qui n'a pas marché ? Qu'est-ce qu'on change ?",
  },
  {
    phase: "retex",
    category: "retex",
    title: "Mettre à jour le plan de réponse à incident",
    description:
      "Intégrer les enseignements dans votre plan écrit. Le plan évolue à chaque incident. Si vous n'aviez pas de plan : c'est le moment d'en écrire un (1 page suffit).",
  },
  {
    phase: "retex",
    category: "retex",
    title: "Plan d'action 30/60/90 jours",
    description:
      "Lister les 3-5 mesures concrètes pour éviter une récidive. Ex : MFA partout, EDR, sauvegardes hors-ligne testées, sensibilisation renforcée. Affecter responsable + échéance.",
  },
  {
    phase: "retex",
    category: "communication",
    title: "Compte-rendu CODIR",
    description:
      "Présenter le bilan en 1 page : impact (financier, opérationnel, image), cause racine, actions correctives, statut. Le COMEX doit savoir et valider les budgets associés.",
  },
];

// ===========================================================================
// SPECIFICITES PAR TYPE D'INCIDENT
// ===========================================================================
const RANSOMWARE_SPECIFIC: PlaybookAction[] = [
  {
    phase: "h0",
    category: "confinement",
    title: "Identifier la souche de ransomware",
    description:
      "Site ID Ransomware (https://id-ransomware.malwarehunterteam.com) : uploader le ransom note ou un fichier chiffré. Déterminer si un déchiffreur gratuit existe (NoMoreRansom.org).",
  },
  {
    phase: "h24",
    category: "communication",
    title: "DÉCISION : payer ou pas la rançon ?",
    description:
      "Recommandation officielle ANSSI : NE PAS PAYER. Payer finance le crime, n'offre AUCUNE garantie de récupération, et marque votre entreprise comme « payeuse » (cible récidiviste). Décision à prendre au niveau dirigeant + assureur.",
  },
];

const DATA_LEAK_SPECIFIC: PlaybookAction[] = [
  {
    phase: "h0",
    category: "preuves",
    title: "Déterminer périmètre exact des données fuitées",
    description:
      "Quelles tables, quels champs, combien de personnes, sur quelle période ? Indispensable pour la notification CNIL (qui exige une description précise).",
  },
  {
    phase: "h24",
    category: "notification",
    title: "Information directe aux personnes concernées",
    description:
      "Si la violation présente un risque ÉLEVÉ pour les personnes (mots de passe, données bancaires, données de santé, données sensibles) : information directe obligatoire sous délais raisonnables (RGPD art. 34).",
    documentSlug: "information-personnes",
  },
];

const PHISHING_VICTIM_SPECIFIC: PlaybookAction[] = [
  {
    phase: "h0",
    category: "confinement",
    title: "Verrouiller le compte compromis",
    description:
      "Réinitialiser le mot de passe, révoquer toutes les sessions actives (Microsoft 365 : 'Sign out everywhere'), désactiver les redirections email frauduleuses, vérifier les règles Outlook créées par l'attaquant.",
  },
  {
    phase: "h0",
    category: "forensic",
    title: "Analyser ce que l'attaquant a fait avec le compte",
    description:
      "Logs Microsoft 365 / Google Workspace : connexions (depuis quels pays/IP), emails envoyés depuis le compte, fichiers téléchargés, partages créés, règles automatiques ajoutées.",
  },
];

const FRAUDE_SPECIFIC: PlaybookAction[] = [
  {
    phase: "h0",
    category: "communication",
    title: "Contacter immédiatement la banque",
    description:
      "Demander le rappel du virement (recall SEPA possible si récent). Si SWIFT : demander le freeze. Plus c'est rapide, plus les chances de récupération sont élevées.",
  },
  {
    phase: "h24",
    category: "preuves",
    title: "Conserver toutes les communications de la fraude",
    description:
      "Emails échangés (avec headers complets), captures d'écran, ordres de virement signés. C'est la base du dossier d'assurance et de la plainte.",
  },
];

const COMPTE_COMPROMIS_SPECIFIC: PlaybookAction[] = [
  {
    phase: "h0",
    category: "confinement",
    title: "Réinitialiser le mot de passe + révoquer les sessions",
    description:
      "Réinitialiser via le compte admin (ne pas utiliser le mail du compte compromis). Activer/forcer le MFA. Révoquer tokens OAuth, mots de passe d'application, clés API du compte.",
  },
];

const DDOS_SPECIFIC: PlaybookAction[] = [
  {
    phase: "h0",
    category: "confinement",
    title: "Activer protection anti-DDoS du fournisseur",
    description:
      "Cloudflare, OVH Anti-DDoS, AWS Shield. Si pas activé : contacter immédiatement votre hébergeur. Possibilité de blackholing sur IP cible côté FAI.",
  },
];

const INTRUSION_SPECIFIC: PlaybookAction[] = [
  {
    phase: "h24",
    category: "forensic",
    title: "Hypothèse : l'attaquant a un foothold persistant",
    description:
      "Considérer que l'attaquant peut avoir laissé des backdoors (comptes admin créés, tâches planifiées, scripts cachés, web shells). Ne pas se contenter de fermer le point d'entrée connu.",
  },
];

// ===========================================================================
// AGGREGATEUR PAR TYPE
// ===========================================================================
export function getPlaybook(type: IncidentType): PlaybookAction[] {
  const common = [
    ...COMMON_H0,
    ...COMMON_H24,
    ...COMMON_H72,
    ...COMMON_W1,
    ...COMMON_RETEX,
  ];
  const specific: Record<IncidentType, PlaybookAction[]> = {
    RANSOMWARE: RANSOMWARE_SPECIFIC,
    DATA_LEAK: DATA_LEAK_SPECIFIC,
    PHISHING_VICTIM: PHISHING_VICTIM_SPECIFIC,
    FRAUDE_FINANCIERE: FRAUDE_SPECIFIC,
    COMPTE_COMPROMIS: COMPTE_COMPROMIS_SPECIFIC,
    INTRUSION: INTRUSION_SPECIFIC,
    DDOS: DDOS_SPECIFIC,
    AUTRE: [],
  };
  return [...common, ...specific[type]];
}

export const INCIDENT_TYPE_LABELS: Record<
  IncidentType,
  { label: string; emoji: string }
> = {
  RANSOMWARE: { label: "Rançongiciel", emoji: "🔒" },
  DATA_LEAK: { label: "Fuite de données", emoji: "📤" },
  PHISHING_VICTIM: { label: "Victime de phishing", emoji: "🎣" },
  FRAUDE_FINANCIERE: { label: "Fraude financière", emoji: "💸" },
  COMPTE_COMPROMIS: { label: "Compte compromis", emoji: "🔓" },
  INTRUSION: { label: "Intrusion système", emoji: "⚠" },
  DDOS: { label: "Déni de service", emoji: "🌊" },
  AUTRE: { label: "Autre", emoji: "❓" },
};

export const INCIDENT_SEVERITY_LABELS = {
  LOW: { label: "Mineur", color: "amber" },
  MEDIUM: { label: "Significatif", color: "orange" },
  HIGH: { label: "Majeur", color: "red" },
  CRITICAL: { label: "Critique", color: "red" },
};

export const INCIDENT_STATUS_LABELS = {
  OPEN: { label: "Ouvert", color: "blue" },
  IN_PROGRESS: { label: "En cours", color: "amber" },
  CONTAINED: { label: "Contenu", color: "green" },
  RESOLVED: { label: "Résolu", color: "green" },
  CLOSED: { label: "Clôturé", color: "gray" },
};

export const PHASE_LABELS = {
  h0: { label: "H+0 - Première heure", emoji: "🚨" },
  h24: { label: "H+24 - Premier jour", emoji: "🕐" },
  h72: { label: "H+72 - Notifications légales", emoji: "📋" },
  w1: { label: "Semaine 1 - Restauration", emoji: "🔧" },
  retex: { label: "RetEx - Retour d'expérience", emoji: "📚" },
};
