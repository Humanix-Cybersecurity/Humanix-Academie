// Donnees structurees du Pack NIS2 par-tenant.
// Un seul fichier source pour les 4 documents : politique sensibilisation,
// procedure incident, registre formations (resume + lien export CSV),
// engagement employe.
//
// PHILOSOPHIE : on ne genere pas du juridique ronflant. On ecrit des
// documents qui :
//   1. tiennent en 1-2 pages chacun
//   2. peuvent etre signes par un dirigeant non-juriste sans relecture cabinet
//   3. couvrent les exigences NIS2 article 21 (mesures techniques + organisationnelles
//      + sensibilisation) sans les sur-imiter (pas de mauvaise foi : NIS2 demande
//      avant tout des "mesures appropriees au risque", pas de checklist exhaustive)

import type { PackNis2Variables } from "./pdf";

export type DocumentSection = {
  heading?: string;
  paragraphs: string[];
  bullets?: string[];
};

export type Document = {
  title: string;
  subtitle: string;
  sections: DocumentSection[];
  footer?: string;
};

const today = (v: PackNis2Variables) =>
  v.generatedAt.toLocaleDateString("fr-FR", { dateStyle: "long" });

// =============================================================================
// 1. POLITIQUE DE SENSIBILISATION CYBER
// =============================================================================
export function policyDocument(v: PackNis2Variables): Document {
  return {
    title: "Politique de sensibilisation à la cybersécurité",
    subtitle: `${v.tenantName} — version du ${today(v)}`,
    sections: [
      {
        heading: "1. Objet",
        paragraphs: [
          `La présente politique fixe les engagements de ${v.tenantName} en matière de sensibilisation à la cybersécurité de l'ensemble de ses collaborateurs, conformément aux exigences de l'article 21 de la directive NIS2 (transposée en France par la loi n° 2024-XXX) et du RGPD article 32.`,
        ],
      },
      {
        heading: "2. Champ d'application",
        paragraphs: [
          `Cette politique s'applique à tous les collaborateurs de ${v.tenantName} (salariés en CDI, CDD, alternants, stagiaires, intérimaires) ainsi qu'aux prestataires accédant aux systèmes d'information de l'entreprise. Elle est portée à leur connaissance dès leur arrivée et signée pour acceptation.`,
        ],
      },
      {
        heading: "3. Engagements",
        paragraphs: ["L'entreprise s'engage à :"],
        bullets: [
          "Déployer un programme de formation continue à la cybersécurité, accessible à 100 % des collaborateurs",
          "Diffuser au moins une action de sensibilisation par mois (newsletter, mini-module, simulation, atelier)",
          "Réaliser au moins une simulation de phishing par semestre",
          "Assurer une intégration cyber pour tous les nouveaux arrivants dès leur premier mois",
          "Mesurer trimestriellement le niveau de maturité cyber via un score collectif documenté",
          "Allouer un budget annuel dédié à la sensibilisation (intégré au budget IT/sécurité)",
        ],
      },
      {
        heading: "4. Outils retenus",
        paragraphs: [
          `${v.tenantName} a fait le choix de la plateforme Humanix Académie pour héberger son programme de sensibilisation. Cette plateforme est hébergée en France (Scaleway, Paris), opérée par Humanix-Cybersecurity, et conforme RGPD (DPA disponible). Le suivi est documenté via le tableau de bord dirigeant qui sert également de preuve d'exécution lors d'un audit (assureur, NIS2, ISO 27001).`,
        ],
      },
      {
        heading: "5. Responsabilités",
        paragraphs: [
          `${v.dpoOrReferent ?? "Le référent cybersécurité interne"} est garant de la mise en œuvre de cette politique. Le dirigeant valide chaque trimestre le rapport d'avancement. Les managers sont responsables du déploiement opérationnel auprès de leurs équipes.`,
        ],
      },
      {
        heading: "6. Révision",
        paragraphs: [
          "Cette politique est revue au minimum annuellement, ou suite à tout incident significatif, à toute évolution réglementaire majeure (NIS2, RGPD), ou à tout changement de prestataire de sensibilisation.",
        ],
      },
      {
        heading: "Signature",
        paragraphs: [
          `Fait à ${v.headquarterCity}, le ${today(v)}.`,
          `Pour ${v.tenantName} : ${v.directeurName} — ${v.directeurTitle}.`,
          "Signature : ____________________________",
        ],
      },
    ],
  };
}

// =============================================================================
// 2. PROCEDURE DE DECLARATION D'INCIDENT (NIS2 article 23)
// =============================================================================
export function incidentDocument(v: PackNis2Variables): Document {
  return {
    title: "Procédure de déclaration d'incident cyber",
    subtitle: `${v.tenantName} — version du ${today(v)}`,
    sections: [
      {
        heading: "Objectif",
        paragraphs: [
          "Cette procédure organise la détection, la qualification, la déclaration et le retour d'expérience face à un incident cyber. Elle vise à respecter les délais de notification fixés par la directive NIS2 (article 23) et le RGPD (article 33).",
        ],
      },
      {
        heading: "Délais réglementaires à connaître",
        paragraphs: [
          "Pour les entités essentielles ou importantes au sens NIS2 :",
        ],
        bullets: [
          "Pré-notification au CSIRT national : sous 24 heures après prise de connaissance",
          "Notification complète au CSIRT national : sous 72 heures",
          "Rapport final : sous 1 mois",
          "(En complément, pour les violations de données personnelles : notification CNIL sous 72 heures — RGPD art. 33)",
        ],
      },
      {
        heading: "Étape 1 — Détection",
        paragraphs: [
          "Tout collaborateur qui détecte ou suspecte un incident (mail piégé cliqué, ransomware, accès anormal, fuite de données) prévient immédiatement :",
        ],
        bullets: [
          `${v.contactCriseName ?? v.directeurName} — ${v.contactCriseEmail ?? v.directeurEmail}`,
          v.contactCriseTel ?? "Téléphone d'urgence : (à compléter)",
        ],
      },
      {
        heading: "Étape 2 — Confinement immédiat",
        paragraphs: [
          "Le contact crise prend les mesures de confinement les plus simples possibles AVANT toute communication :",
        ],
        bullets: [
          "Déconnecter du réseau les postes/serveurs suspects (câble réseau / WiFi off)",
          "NE PAS éteindre les postes (préservation de la mémoire pour analyse forensique)",
          "Identifier le périmètre des données potentiellement exposées",
          "Conserver les logs (mail, pare-feu, AD) — ne rien purger",
        ],
      },
      {
        heading: "Étape 3 — Qualification",
        paragraphs: [
          "Sous 4 heures, le contact crise qualifie l'incident pour décider de la déclaration externe : nature (ransomware, fuite, compromission de compte, défacement…), périmètre (nb de comptes, volume de données, services impactés), gravité (faible/modérée/grave/critique).",
          `En cas de doute, ${v.tenantName} peut s'appuyer sur :`,
        ],
        bullets: [
          "Cybermalveillance.gouv.fr (TPE/PME, gratuit)",
          "ANSSI / CSIRT National (cert.ssi.gouv.fr) pour les opérateurs concernés NIS2",
          "Son assurance cyber (le sinistre est généralement couvert sous 24h)",
        ],
      },
      {
        heading: "Étape 4 — Notification réglementaire",
        paragraphs: [
          "Si l'entreprise est concernée par NIS2 : notification CSIRT national sous 24h (pré-notification) puis 72h (rapport).",
          "Si des données personnelles sont concernées : notification CNIL sous 72h via notifications.cnil.fr.",
          "Information des personnes concernées si un risque élevé pour leurs droits et libertés est identifié (RGPD art. 34).",
        ],
      },
      {
        heading: "Étape 5 — Retour d'expérience (REX)",
        paragraphs: [
          "Sous 30 jours après résolution, un REX est rédigé : chronologie des faits, mesures prises, leçons apprises, actions correctives. Le REX est conservé au minimum 5 ans.",
        ],
      },
      {
        heading: "Annexe — Coordonnées utiles",
        paragraphs: [],
        bullets: [
          "ANSSI / CERT-FR : cert-fr.cossi.defense.gouv.fr — 01 71 75 84 50",
          "CNIL : notifications.cnil.fr",
          "Cybermalveillance.gouv.fr — 0 805 805 817",
          "Police judiciaire : 17 ou pre-plainte-en-ligne.gouv.fr",
        ],
      },
    ],
  };
}

// =============================================================================
// 3. REGISTRE DES FORMATIONS (resume — l'export CSV/PDF est dynamique)
// =============================================================================
export function trainingRegisterDocument(v: PackNis2Variables): Document {
  return {
    title: "Registre des actions de sensibilisation cyber",
    subtitle: `${v.tenantName} — extrait du ${today(v)}`,
    sections: [
      {
        heading: "Présentation",
        paragraphs: [
          `Conformément à la politique de sensibilisation cyber de ${v.tenantName}, ce registre consolide l'ensemble des actions de formation et de sensibilisation suivies par les collaborateurs sur les 12 derniers mois. Il sert de preuve auprès d'un assureur, d'un client auditeur ou d'une autorité.`,
        ],
      },
      {
        heading: "Statistiques globales",
        paragraphs: [],
        bullets: [
          `Nombre de collaborateurs concernés : ${v.totalLearners}`,
          `Modules complétés sur la période : ${v.totalCompletedModules}`,
          `Score moyen aux quiz : ${v.averageScore}/100`,
          `Score collectif de risque : ${v.riskScore}/100`,
          `Simulations phishing organisées : ${v.phishingCampaigns}`,
        ],
      },
      {
        heading: "Périodicité de mise à jour",
        paragraphs: [
          "Ce registre est mis à jour automatiquement par la plateforme Humanix Académie. Une version horodatée (PDF + CSV) peut être exportée à tout moment depuis le tableau de bord dirigeant.",
        ],
      },
      {
        heading: "Format détaillé (export CSV)",
        paragraphs: [
          "L'export CSV nominatif est disponible depuis : Console dirigeant > Utilisateurs > Exporter. Colonnes incluses : nom, prénom, service, modules complétés, score moyen, dernière connexion. Conservé 5 ans après cessation du contrat de travail (durée légale de la preuve formation).",
        ],
      },
    ],
  };
}

// =============================================================================
// 4. ENGAGEMENT EMPLOYE (cyber-charte courte)
// =============================================================================
export function employeeChartDocument(v: PackNis2Variables): Document {
  return {
    title: "Engagement cyber du collaborateur",
    subtitle: `${v.tenantName} — version du ${today(v)}`,
    sections: [
      {
        paragraphs: [
          `Dans le cadre de mon contrat de travail avec ${v.tenantName} et conformément à sa politique de sensibilisation à la cybersécurité, je m'engage à :`,
        ],
      },
      {
        heading: "1. Authentification",
        paragraphs: [],
        bullets: [
          "Utiliser des mots de passe différents pour chaque service professionnel, gérés via un gestionnaire de mots de passe",
          "Activer l'authentification multi-facteur (MFA) sur tous les services critiques quand elle est proposée",
          "Ne jamais partager mes identifiants avec un collègue, un proche, ou un prestataire",
        ],
      },
      {
        heading: "2. Vigilance phishing",
        paragraphs: [],
        bullets: [
          "Vérifier l'expéditeur et l'URL avant tout clic sur un lien email professionnel",
          "Signaler immédiatement à mon référent cyber tout mail suspect (faux Microsoft, fraude au président, fausse facture…)",
          "Ne jamais transmettre d'information sensible (RIB, identifiant, document confidentiel) sans validation orale du demandeur",
        ],
      },
      {
        heading: "3. Données et matériel",
        paragraphs: [],
        bullets: [
          "Verrouiller mon poste de travail dès que je m'éloigne",
          "Utiliser uniquement les outils validés par l'entreprise pour stocker des données professionnelles",
          "En cas de perte/vol de matériel professionnel, prévenir sous 24 heures",
        ],
      },
      {
        heading: "4. Formation",
        paragraphs: [],
        bullets: [
          "Compléter les modules de sensibilisation cyber qui me sont attribués dans les délais demandés",
          "Participer aux simulations de phishing comme à toute autre action pédagogique",
          "Demander une explication à mon manager ou au référent cyber si une consigne ne me semble pas claire",
        ],
      },
      {
        heading: "5. Incidents",
        paragraphs: [],
        bullets: [
          "Prévenir immédiatement (sans crainte de sanction) toute action que j'aurais pu effectuer par erreur (clic sur un mail piégé, perte de matériel, partage involontaire)",
          "Coopérer avec les équipes de réponse à incident pour limiter les dommages",
        ],
      },
      {
        heading: "Signature",
        paragraphs: [
          "Je reconnais avoir pris connaissance de la politique de sensibilisation cyber et m'engage à la respecter.",
          "",
          "Nom du collaborateur : ____________________________",
          "Service / poste : ____________________________",
          `Fait à ${v.headquarterCity}, le _______________`,
          "Signature du collaborateur : ____________________________",
        ],
      },
    ],
  };
}

// =============================================================================
// AGGREGATION
// =============================================================================
export function buildAllDocuments(v: PackNis2Variables): Document[] {
  return [
    policyDocument(v),
    incidentDocument(v),
    trainingRegisterDocument(v),
    employeeChartDocument(v),
  ];
}
