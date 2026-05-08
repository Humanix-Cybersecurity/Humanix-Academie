// SPDX-License-Identifier: AGPL-3.0-or-later
// Mapping GRC : Humanix -> referentiels de conformite
// (ISO 27001, NIS2, RGPD, ANSSI HG, NIST CSF, Loi Sapin II Art. 17)
// Utilise par /api/v1/evidence-export et le connecteur CISO Assistant.
//
// Philosophie : un mapping est un *contrat stable* entre nos donnees internes
// et le langage des RSSI. On documente explicitement ce qu'on couvre, ce qu'on
// ne couvre pas, et comment on calcule un score par controle.
//
// Conformite et integrite : on ne doit JAMAIS surcoter un controle. Si on n'a
// pas la donnee, on retourne `not_assessed` plutot qu'un score arbitraire.

export type FrameworkRef =
  | "ISO27001:2022"
  | "NIS2"
  | "RGPD"
  | "ANSSI-HG"
  | "NIST-CSF"
  | "SAPIN2";

export type ArtifactType =
  | "metric" // chiffre cle (taux, score, count)
  | "document" // pdf, json, csv telechargeable
  | "report" // rapport genere a la demande
  | "policy" // politique signee (Pack NIS2, DPA)
  | "event_log"; // extrait de la table Event

export type EvidenceStatus =
  | "compliant" // controle couvert + donnees a jour
  | "partial" // controle partiellement couvert
  | "non_compliant" // donnees insuffisantes pour le seuil
  | "not_assessed"; // hors scope Humanix

export type ArtifactSource = {
  type: ArtifactType;
  // Cle logique (resolue par l'endpoint en URL ou valeur)
  source:
    | "tenant_score" // score de maturite tenant calcule en live
    | "completion_rate" // taux de completion par saison
    | "phishing_report_rate" // taux de signalement phishing
    | "user_certificates" // certificats individuels (lien bulk)
    | "pack_nis2_pdf" // export Pack NIS2 du tenant
    | "registre_traitements_pdf" // registre RGPD art. 30
    | "dpa_pdf" // contrat DPA art. 28
    | "audit_trail" // logs Event filtres
    | "marketplace_modules" // modules deployes sur ce thème
    | "incident_procedure" // procedure incident du Pack NIS2
    | "compliance_report"; // rapport conformite genere a la demande (Sapin II / NIS2 / etc.)
  // Description humaine pour l'auditeur
  label: string;
  // Filtres optionnels (ex : module slug, type d'evenement)
  filter?: Record<string, string | number | boolean>;
};

export type ControlMapping = {
  ref: string; // identifiant referentiel (ex: A.6.3, art-21-2-i)
  name: string; // titre du controle dans le referentiel
  category?: string; // chapitre/famille
  artifacts: ArtifactSource[]; // sources de preuves
  // Seuil au-dessus duquel le controle est considere "compliant"
  // Calcule sur le 1er artifact de type "metric".
  thresholdCompliant?: number; // ex: 0.7 -> 70% completion
  thresholdPartial?: number; // ex: 0.4
  // Note pour l'auditeur (ce qu'on couvre, ce qu'on ne couvre pas)
  scopeNote?: string;
};

export type FrameworkMapping = {
  ref: FrameworkRef;
  title: string;
  publisher: string;
  url: string;
  controls: ControlMapping[];
  // Controles hors scope explicitement (transparence)
  outOfScope: { ref: string; reason: string }[];
};

// ---------------------------------------------------------------------------
// ISO 27001:2022 (Annexe A)
// ---------------------------------------------------------------------------

const ISO_27001_2022: FrameworkMapping = {
  ref: "ISO27001:2022",
  title: "ISO/IEC 27001:2022 - Annexe A",
  publisher: "ISO",
  url: "https://www.iso.org/standard/27001",
  controls: [
    {
      ref: "A.5.1",
      name: "Politiques de securite de l'information",
      category: "Controles organisationnels",
      artifacts: [
        {
          type: "policy",
          source: "pack_nis2_pdf",
          label: "Politique cybersecurite (Pack NIS2)",
        },
        {
          type: "policy",
          source: "dpa_pdf",
          label: "Contrat de sous-traitance DPA",
        },
      ],
      scopeNote:
        "Humanix fournit la politique generale via le Pack NIS2. Les politiques techniques specifiques restent a la charge du client.",
    },
    {
      ref: "A.5.24",
      name: "Planification et preparation des incidents de securite",
      category: "Controles organisationnels",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label: "Procedure de reponse a incident (Pack NIS2)",
        },
      ],
    },
    {
      ref: "A.6.3",
      name: "Sensibilisation, formation et entrainement a la securite",
      category: "Controles relatifs aux personnes",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Score de maturite cyber humaine du tenant",
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de completion sensibilisation",
        },
        {
          type: "document",
          source: "user_certificates",
          label: "Certificats individuels utilisateurs",
        },
        {
          type: "report",
          source: "audit_trail",
          label: "Rapport sensibilisation periodique",
          filter: { type: "episode.completed" },
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
      scopeNote: "Coeur de mission Humanix - couverture forte.",
    },
    {
      ref: "A.6.6",
      name: "Engagements de confidentialite ou de non-divulgation",
      category: "Controles relatifs aux personnes",
      artifacts: [
        {
          type: "policy",
          source: "dpa_pdf",
          label: "DPA signe par le client",
        },
      ],
    },
    {
      ref: "A.6.8",
      name: "Signalement des evenements de securite de l'information",
      category: "Controles relatifs aux personnes",
      artifacts: [
        {
          type: "metric",
          source: "phishing_report_rate",
          label: "Taux de signalement phishing",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Logs evenements signalement",
          filter: { type: "phishing.report" },
        },
      ],
      thresholdCompliant: 0.5,
      thresholdPartial: 0.2,
    },
    {
      ref: "A.7.7",
      name: "Bureau et ecran propres",
      category: "Controles physiques",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Module sensibilisation Bureau propre deploye",
          filter: { slug: "bureau-propre" },
        },
      ],
    },
    {
      ref: "A.8.7",
      name: "Protection contre les logiciels malveillants",
      category: "Controles technologiques",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Modules malware/ransomware deployes",
          filter: { category: "malware" },
        },
      ],
      scopeNote:
        "Humanix couvre uniquement le volet sensibilisation. La protection technique (EDR, AV) reste hors scope.",
    },
  ],
  outOfScope: [
    {
      ref: "A.8.1",
      reason: "Equipements terminaux - hors scope sensibilisation",
    },
    {
      ref: "A.8.16",
      reason: "Surveillance reseau - outils techniques GRC requis",
    },
    {
      ref: "A.8.23",
      reason: "Filtrage Web - outils techniques tiers (proxy, DNS)",
    },
  ],
};

// ---------------------------------------------------------------------------
// NIS2 (Directive UE 2022/2555)
// ---------------------------------------------------------------------------

const NIS2: FrameworkMapping = {
  ref: "NIS2",
  title: "Directive (UE) 2022/2555 - NIS2",
  publisher: "Union Europeenne",
  url: "https://eur-lex.europa.eu/eli/dir/2022/2555",
  controls: [
    {
      ref: "art-21-2-a",
      name: "Politiques relatives a l'analyse des risques et a la securite des SI",
      category: "Mesures de gestion des risques",
      artifacts: [
        {
          type: "policy",
          source: "pack_nis2_pdf",
          label: "Pack NIS2 - politique cybersecurite",
        },
        { type: "policy", source: "dpa_pdf", label: "DPA art. 28 RGPD" },
      ],
    },
    {
      ref: "art-21-2-b",
      name: "Gestion des incidents",
      category: "Mesures de gestion des risques",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label: "Procedure incident Pack NIS2",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Logs incidents detectes",
          filter: { type: "incident.declared" },
        },
      ],
    },
    {
      ref: "art-21-2-g",
      name: "Pratiques d'hygiene cybernetique de base et formation a la cybersecurite",
      category: "Mesures de gestion des risques",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Score de maturite cyber humaine",
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de completion sensibilisation",
        },
        {
          type: "document",
          source: "user_certificates",
          label: "Certificats individuels",
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
      scopeNote:
        "Article central pour Humanix - obligation explicite de formation cybersecurite.",
    },
    {
      ref: "art-21-2-i",
      name: "Politiques en matiere de ressources humaines / Securite du personnel",
      category: "Mesures de gestion des risques",
      artifacts: [
        {
          type: "document",
          source: "registre_traitements_pdf",
          label: "Registre RGPD - traitement RH",
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de completion onboarding RH",
        },
      ],
    },
    {
      ref: "art-23",
      name: "Notification d'incidents (24h / 72h / 1 mois)",
      category: "Obligation de notification",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label: "Procedure de notification (Pack NIS2)",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Logs notification incidents",
          filter: { type: "incident.notified" },
        },
      ],
    },
  ],
  outOfScope: [
    {
      ref: "art-21-2-c",
      reason:
        "Continuite des activites - DRP/BCP technique hors scope sensibilisation",
    },
    {
      ref: "art-21-2-d",
      reason: "Securite chaine d'approvisionnement - outils SCRM tiers",
    },
    {
      ref: "art-21-2-h",
      reason: "Cryptographie - configuration technique hors sensibilisation",
    },
  ],
};

// ---------------------------------------------------------------------------
// RGPD
// ---------------------------------------------------------------------------

const RGPD: FrameworkMapping = {
  ref: "RGPD",
  title: "Reglement (UE) 2016/679 - Protection des donnees",
  publisher: "Union Europeenne",
  url: "https://eur-lex.europa.eu/eli/reg/2016/679",
  controls: [
    {
      ref: "art-5",
      name: "Principes relatifs au traitement des donnees a caractere personnel",
      category: "Principes",
      artifacts: [
        {
          type: "document",
          source: "registre_traitements_pdf",
          label: "Registre des traitements art. 30",
        },
      ],
    },
    {
      ref: "art-25",
      name: "Protection des donnees des la conception et par defaut",
      category: "Obligations responsable de traitement",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Audit securite public Humanix v1.0",
          filter: { type: "evidence.audit_security" },
        },
      ],
    },
    {
      ref: "art-28",
      name: "Sous-traitant",
      category: "Relations contractuelles",
      artifacts: [
        {
          type: "policy",
          source: "dpa_pdf",
          label: "Contrat de sous-traitance DPA signe",
        },
      ],
    },
    {
      ref: "art-30",
      name: "Registre des activites de traitement",
      category: "Documentation",
      artifacts: [
        {
          type: "document",
          source: "registre_traitements_pdf",
          label: "Registre des traitements - cote responsable + sous-traitant",
        },
      ],
    },
    {
      ref: "art-32",
      name: "Securite du traitement",
      category: "Obligations responsable de traitement",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Rapport audit securite Humanix",
          filter: { type: "evidence.audit_security" },
        },
        {
          type: "metric",
          source: "tenant_score",
          label: "Score de maturite humaine (couche organisationnelle)",
        },
      ],
    },
    {
      ref: "art-33",
      name: "Notification d'une violation de donnees a caractere personnel",
      category: "Obligations en cas de violation",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label: "Procedure violation 72h (Pack NIS2)",
        },
      ],
    },
    {
      ref: "art-39",
      name: "Missions du delegue a la protection des donnees",
      category: "DPO",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion module RGPD",
          filter: { category: "rgpd" },
        },
      ],
    },
  ],
  outOfScope: [
    {
      ref: "art-44-50",
      reason: "Transferts hors UE - non applicable (Humanix 100% France/UE)",
    },
  ],
};

// ---------------------------------------------------------------------------
// ANSSI - Guide d'hygiene informatique (renforcee)
// ---------------------------------------------------------------------------

const ANSSI_HG: FrameworkMapping = {
  ref: "ANSSI-HG",
  title: "ANSSI - Guide d'hygiene informatique - 42 mesures",
  publisher: "ANSSI",
  url: "https://www.ssi.gouv.fr/guide/guide-dhygiene-informatique/",
  controls: [
    {
      ref: "M1",
      name: "Sensibiliser les utilisateurs aux bonnes pratiques elementaires de securite informatique",
      category: "Sensibilisation",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Score de maturite cyber",
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de completion",
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
      scopeNote: "Mesure phare ANSSI - couverte directement par Humanix.",
    },
    {
      ref: "M2",
      name: "Authentifier l'utilisateur",
      category: "Authentification",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Modules MFA / mots de passe deployes",
          filter: { category: "auth" },
        },
      ],
    },
    {
      ref: "M3",
      name: "Identifier nommement chaque utilisateur",
      category: "Authentification",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Comptes nominatifs (vs partages)",
        },
      ],
    },
    {
      ref: "M11",
      name: "Identifier les informations sensibles et savoir comment les manipuler",
      category: "Donnees",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Modules classification donnees deployes",
          filter: { slug: "classification-donnees" },
        },
      ],
    },
    {
      ref: "M22",
      name: "Sensibiliser les utilisateurs aux risques lies a la mobilite",
      category: "Mobilite",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Modules teletravail/nomadisme deployes",
          filter: { category: "mobilite" },
        },
      ],
    },
    {
      ref: "M30",
      name: "Sensibiliser les utilisateurs face aux courriels malveillants (phishing)",
      category: "Sensibilisation",
      artifacts: [
        {
          type: "metric",
          source: "phishing_report_rate",
          label: "Taux de signalement phishing simule",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Campagnes phishing IA executees",
          filter: { type: "phishing.campaign_completed" },
        },
      ],
      thresholdCompliant: 0.5,
      thresholdPartial: 0.2,
    },
    {
      ref: "M40",
      name: "Definir une politique de gestion des incidents de securite",
      category: "Reponse a incident",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label: "Procedure incident Pack NIS2",
        },
      ],
    },
  ],
  outOfScope: [
    { ref: "M5-M10", reason: "Configuration postes - outils techniques tiers" },
    {
      ref: "M16-M20",
      reason: "Architecture reseau - hors scope sensibilisation",
    },
    {
      ref: "M35-M39",
      reason: "Securite physique - hors scope plateforme SaaS",
    },
  ],
};

// ---------------------------------------------------------------------------
// NIST CSF (squelette - mapping detaille en v1.1)
// ---------------------------------------------------------------------------

const NIST_CSF: FrameworkMapping = {
  ref: "NIST-CSF",
  title: "NIST Cybersecurity Framework v2.0 (squelette)",
  publisher: "NIST",
  url: "https://www.nist.gov/cyberframework",
  controls: [
    {
      ref: "PR.AT-01",
      name: "Awareness and training - All users",
      category: "Protect",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Cyber maturity score",
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
    },
    {
      ref: "PR.AT-02",
      name: "Awareness and training - Privileged users",
      category: "Protect",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Completion - admins/managers",
          filter: { role: "ADMIN_OR_MANAGER" },
        },
      ],
    },
  ],
  outOfScope: [
    {
      ref: "ID.* / DE.* / RS.* / RC.*",
      reason:
        "Mapping NIST detaille prevu en v1.1 - sortie initiale focus sur PR (Protect)",
    },
  ],
};

// ---------------------------------------------------------------------------
// SAPIN II - Loi 2016-1691 du 9 decembre 2016 (anti-corruption)
// Article 17 : 8 mesures obligatoires pour entreprises >500 salaries OU
// CA > 100 M€. Humanix couvre le pilier formation/sensibilisation (mesure 6)
// ainsi que tout l'aspect "fraude au president" / "faux fournisseur" / vishing
// qui sont les vecteurs typiques de la corruption ciblee par la loi.
//
// Sanctions personne morale : jusqu'a 1 M€. Controles AFA (Agence francaise
// anticorruption). Differenciant ENORME en France vs concurrents US.
// ---------------------------------------------------------------------------
const SAPIN2: FrameworkMapping = {
  ref: "SAPIN2",
  title: "Loi Sapin II - Article 17 (transparence, lutte anti-corruption)",
  publisher: "Republique francaise",
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000033558528/",
  controls: [
    {
      ref: "art-17-II-3",
      name: "Cartographie des risques de corruption (volet humain)",
      category: "Mesure 3 - Cartographie risques",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Score de risque humain - exposition fraude/corruption",
        },
        {
          type: "report",
          source: "compliance_report",
          label: "Rapport conformite (cas fraude-president, vishing exec)",
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
      scopeNote:
        "Humanix mappe le volet humain (manipulation, ingenierie sociale, fraude au president). " +
        "Le volet financier/comptable reste a la charge des outils GRC dedies (CISO Assistant, Eramba).",
    },
    {
      ref: "art-17-II-6",
      name: "Dispositif de formation des cadres et personnels exposes",
      category: "Mesure 6 - Formation (PILIER HUMANIX)",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de completion saison fraude-president",
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de completion modules ingenierie sociale (phishing/vishing)",
        },
        {
          type: "document",
          source: "user_certificates",
          label: "Certificats individuels de formation (preuve AFA)",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Journal des completions par utilisateur expose",
          filter: { type: "module.completed" },
        },
      ],
      thresholdCompliant: 0.8,
      thresholdPartial: 0.5,
      scopeNote:
        "ARTICLE CENTRAL POUR HUMANIX. La saison 'fraude-president' (6 modules : " +
        "mecanisme, faux virement, changement RIB, deepfake vocal, double validation, " +
        "cas Pathe) est le coeur du dispositif Sapin II cote sensibilisation. " +
        "Modules complementaires : phishing cible exec, vishing 'fake CFO'.",
    },
    {
      ref: "art-17-II-7",
      name: "Regime disciplinaire (preuve de connaissance du regime)",
      category: "Mesure 7 - Sanction disciplinaire",
      artifacts: [
        {
          type: "document",
          source: "user_certificates",
          label: "Acceptation tracable de la charte cyber + fraude (timestamp + signature electronique)",
        },
      ],
      scopeNote:
        "Humanix fournit la trace tamper-proof que l'utilisateur a complete la formation et " +
        "accepte le code de conduite. Element de preuve devant l'AFA en cas de contestation " +
        "de sanction disciplinaire pour fraude.",
    },
    {
      ref: "art-17-II-8",
      name: "Dispositif de controle et evaluation interne des mesures",
      category: "Mesure 8 - Controle interne",
      artifacts: [
        {
          type: "metric",
          source: "phishing_report_rate",
          label: "Taux de signalement phishing (= efficacite de la formation)",
        },
        {
          type: "report",
          source: "compliance_report",
          label: "Rapport tendance trimestriel (evolution du score d'exposition)",
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
  ],
  outOfScope: [
    {
      ref: "art-17-II-1",
      reason: "Code de conduite : redaction juridique, hors scope SAT/HRM",
    },
    {
      ref: "art-17-II-2",
      reason: "Dispositif d'alerte interne (whistleblowing) : outils dedies (Whispli, etc.)",
    },
    {
      ref: "art-17-II-4",
      reason: "Procedure d'evaluation des tiers : outils KYC/KYS dedies",
    },
    {
      ref: "art-17-II-5",
      reason: "Controle comptable : ERP financier (SAP, Sage, etc.)",
    },
  ],
};

// ---------------------------------------------------------------------------
// Registre principal
// ---------------------------------------------------------------------------

export const FRAMEWORKS: Record<FrameworkRef, FrameworkMapping> = {
  "ISO27001:2022": ISO_27001_2022,
  NIS2,
  RGPD,
  "ANSSI-HG": ANSSI_HG,
  "NIST-CSF": NIST_CSF,
  SAPIN2,
};

export const SUPPORTED_FRAMEWORKS: FrameworkRef[] = [
  "ISO27001:2022",
  "NIS2",
  "RGPD",
  "ANSSI-HG",
  "NIST-CSF",
  "SAPIN2",
];

/**
 * Calcule le statut d'un controle a partir d'une valeur metric (0-1).
 * Retourne `not_assessed` si la valeur n'est pas fournie ou si le controle
 * n'a pas de seuil defini (cas des controles purement documentaires).
 */
export function statusFromMetric(
  value: number | null | undefined,
  control: ControlMapping,
): EvidenceStatus {
  if (value === null || value === undefined) return "not_assessed";
  if (control.thresholdCompliant === undefined) return "compliant";
  if (value >= control.thresholdCompliant) return "compliant";
  if (
    control.thresholdPartial !== undefined &&
    value >= control.thresholdPartial
  )
    return "partial";
  return "non_compliant";
}

/**
 * Garde-fou : un controle exclusivement documentaire (policy, document) est
 * considere "compliant" des qu'au moins un artifact existe physiquement.
 */
export function isDocumentaryOnly(control: ControlMapping): boolean {
  return control.artifacts.every(
    (a) => a.type === "policy" || a.type === "document",
  );
}
