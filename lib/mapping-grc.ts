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

import { CATALOGUE_CHIFFRES } from "@/lib/catalogue-chiffres";

export type FrameworkRef =
  | "ISO27001:2022"
  | "NIS2"
  | "RGPD"
  | "ANSSI-HG"
  | "NIST-CSF"
  | "SAPIN2"
  | "SOC2";

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
      name: "Politiques de sécurité de l'information",
      category: "Contrôles organisationnels",
      artifacts: [
        {
          type: "policy",
          source: "pack_nis2_pdf",
          label: "Politique cybersécurité (Pack NIS2)",
        },
        {
          type: "policy",
          source: "dpa_pdf",
          label: "Contrat de sous-traitance DPA",
        },
      ],
      scopeNote:
        "Humanix fournit la politique générale via le Pack NIS2. Les politiques techniques spécifiques restent à la charge du client.",
    },
    {
      ref: "A.5.24",
      name: "Planification et préparation des incidents de sécurité",
      category: "Contrôles organisationnels",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label: "Procédure de réponse à incident (Pack NIS2)",
        },
      ],
    },
    {
      ref: "A.6.3",
      name: "Sensibilisation, formation et entraînement à la sécurité",
      category: "Contrôles relatifs aux personnes",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Score de maturité cyber humaine du tenant",
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de complétion sensibilisation",
        },
        {
          type: "document",
          source: "user_certificates",
          label: "Certificats individuels utilisateurs",
        },
        {
          type: "report",
          source: "audit_trail",
          label: "Rapport sensibilisation périodique",
          filter: { type: "episode.completed" },
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
      scopeNote: "Coeur de mission Humanix - couverture forte.",
    },
    {
      ref: "A.6.6",
      name: "Engagements de confidentialité ou de non-divulgation",
      category: "Contrôles relatifs aux personnes",
      artifacts: [
        {
          type: "policy",
          source: "dpa_pdf",
          label: "DPA signé par le client",
        },
      ],
    },
    {
      ref: "A.6.8",
      name: "Signalement des événements de sécurité de l'information",
      category: "Contrôles relatifs aux personnes",
      artifacts: [
        {
          type: "metric",
          source: "phishing_report_rate",
          label: "Taux de signalement phishing",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Logs événements signalement",
          filter: { type: "phishing.report" },
        },
      ],
      thresholdCompliant: 0.5,
      thresholdPartial: 0.2,
    },
    {
      ref: "A.7.7",
      name: "Bureau et écran propres",
      category: "Contrôles physiques",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Module sensibilisation Bureau propre déployé",
          filter: { slug: "bureau-propre" },
        },
      ],
      // Metric binaire : 0 = module non deploye, 1 = deploye. Seuil 0.5 :
      // un seul module suffit a satisfaire le controle "sensibilisation
      // bureau et ecran propres" cote couverture Humanix. Le controle
      // technique (verrouillage ecran, etc.) reste hors scope.
      thresholdCompliant: 0.5,
    },
    {
      ref: "A.8.7",
      name: "Protection contre les logiciels malveillants",
      category: "Contrôles technologiques",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Modules malware/ransomware déployés",
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
      reason: "Équipements terminaux - hors scope sensibilisation",
    },
    {
      ref: "A.8.16",
      reason: "Surveillance réseau - outils techniques GRC requis",
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
  publisher: "Union Européenne",
  url: "https://eur-lex.europa.eu/eli/dir/2022/2555",
  controls: [
    {
      ref: "art-21-2-a",
      name: "Politiques relatives à l'analyse des risques et à la sécurité des SI",
      category: "Mesures de gestion des risques",
      artifacts: [
        {
          type: "policy",
          source: "pack_nis2_pdf",
          label: "Pack NIS2 - politique cybersécurité",
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
          label: "Procédure incident Pack NIS2",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Logs incidents détectés",
          filter: { type: "incident.declared" },
        },
      ],
    },
    {
      ref: "art-21-2-g",
      name: "Pratiques d'hygiène cybernétique de base et formation à la cybersécurité",
      category: "Mesures de gestion des risques",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Score de maturité cyber humaine",
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de complétion sensibilisation",
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
        "Article central pour Humanix - obligation explicite de formation cybersécurité.",
    },
    {
      ref: "art-21-2-i",
      name: "Politiques en matière de ressources humaines / Sécurité du personnel",
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
          label: "Taux de complétion onboarding RH",
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
          label: "Procédure de notification (Pack NIS2)",
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
        "Continuité des activités - DRP/BCP technique hors scope sensibilisation",
    },
    {
      ref: "art-21-2-d",
      reason: "Sécurité chaîne d'approvisionnement - outils SCRM tiers",
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
  title: "Règlement (UE) 2016/679 - Protection des données",
  publisher: "Union Européenne",
  url: "https://eur-lex.europa.eu/eli/reg/2016/679",
  controls: [
    {
      ref: "art-5",
      name: "Principes relatifs au traitement des données à caractère personnel",
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
      name: "Protection des données dès la conception et par défaut",
      category: "Obligations responsable de traitement",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Audit sécurité public Humanix v1.0",
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
          label: "Contrat de sous-traitance DPA signé",
        },
      ],
    },
    {
      ref: "art-30",
      name: "Registre des activités de traitement",
      category: "Documentation",
      artifacts: [
        {
          type: "document",
          source: "registre_traitements_pdf",
          label: "Registre des traitements - côté responsable + sous-traitant",
        },
      ],
    },
    {
      ref: "art-32",
      name: "Sécurité du traitement",
      category: "Obligations responsable de traitement",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Rapport audit sécurité Humanix",
          filter: { type: "evidence.audit_security" },
        },
        {
          type: "metric",
          source: "tenant_score",
          label: "Score de maturité humaine (couche organisationnelle)",
        },
      ],
    },
    {
      ref: "art-33",
      name: "Notification d'une violation de données à caractère personnel",
      category: "Obligations en cas de violation",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label: "Procédure violation 72h (Pack NIS2)",
        },
      ],
    },
    {
      ref: "art-39",
      name: "Missions du délégué à la protection des données",
      category: "DPO",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion module RGPD",
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

// ANSSI - Guide d'hygiene informatique v2 (42 mesures, edition 2017)
// Reference : https://cyber.gouv.fr/publications/guide-dhygiene-informatique
//
// COUVERTURE DOUBLE pour Humanix :
//   1. PEDAGOGIQUE (axe principal) : modules MDX qui sensibilisent les utilisateurs
//      aux mesures qui concernent leur poste de travail. Mesure par
//      `completion_rate` / `marketplace_modules`.
//   2. PLATEFORME (axe complementaire) : conformite de la plateforme Humanix
//      elle-meme aux mesures (ex: M7 inventaire prives via /superadmin/admins-by-tenant,
//      M16 MFA, M14 hash scrypt, M36 audit_trail, M37 backup self-host age, etc.).
//      Mesure par presence d'artifacts internes (audit_trail filtre, policy interne).
//
// HORS SCOPE assume : mesures qui ne dependent QUE de la config reseau / postes
// du client (M9 limiter Internet, M25 passerelle Internet, M26 cloisonnement DMZ,
// M19 outil gestion centralisee parc). Pour celles-la, Humanix fournit la
// sensibilisation des utilisateurs / admins mais la mise en oeuvre technique
// reste du cote client.
const ANSSI_HG: FrameworkMapping = {
  ref: "ANSSI-HG",
  title: "ANSSI - Guide d'hygiène informatique (v2, 42 mesures)",
  publisher: "ANSSI",
  url: "https://cyber.gouv.fr/publications/guide-dhygiene-informatique",
  controls: [
    // -------------------------------------------------------------------------
    // I. Sensibiliser et former
    // -------------------------------------------------------------------------
    {
      ref: "M1",
      name: "Former les équipes opérationnelles à la sécurité des systèmes d'information",
      category: "I. Sensibiliser et former",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de complétion modules admin/dev/SOC",
          filter: { audience: "admin_or_dev" },
        },
        {
          type: "metric",
          source: "marketplace_modules",
          label:
            "Saisons techniques déployées (cyber-dev, securiser-administration-si)",
          filter: { audience: "operationnel" },
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
      scopeNote:
        "Couvre saisons cyber-dev (6 ep), cyber-dirigeants (6 ep), securiser-administration-si (6 ep). Cible le personnel opérationnel SI.",
    },
    {
      ref: "M2",
      name: "Sensibiliser les utilisateurs aux bonnes pratiques élémentaires de sécurité informatique",
      category: "I. Sensibiliser et former",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Score de maturité cyber humaine du tenant",
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de complétion saisons fondamentales",
        },
        {
          type: "document",
          source: "user_certificates",
          label: "Certificats individuels (preuve formation)",
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
      scopeNote: `MESURE PHARE HUMANIX. ${CATALOGUE_CHIFFRES.saisons} saisons / ${CATALOGUE_CHIFFRES.modules} modules couvrent l'ensemble des bonnes pratiques (phishing, mots de passe, données sensibles, mobilité, etc.).`,
    },

    // -------------------------------------------------------------------------
    // II. Connaitre le systeme d'information
    // -------------------------------------------------------------------------
    {
      ref: "M3",
      name: "Maîtriser les risques de l'infogérance",
      category: "II. Connaître le SI",
      artifacts: [
        {
          type: "policy",
          source: "dpa_pdf",
          label: "Contrat de sous-traitance DPA (art. 28 RGPD)",
        },
        {
          type: "policy",
          source: "pack_nis2_pdf",
          label: "Pack NIS2 - clauses sécurité prestataires",
        },
      ],
      scopeNote:
        "Humanix fournit le DPA et les clauses sécurité type pour encadrer les prestataires du client.",
    },
    {
      ref: "M4",
      name: "Identifier les informations et serveurs les plus sensibles et maintenir un schéma du réseau",
      category: "II. Connaître le SI",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Modules classification données sensibles déployés",
          filter: { slug: "classification-donnees" },
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion saison donnees-sensibles",
          filter: { saison: "donnees-sensibles" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M5",
      name: "Disposer d'une cartographie précise de l'installation informatique et la maintenir à jour",
      category: "II. Connaître le SI",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Cartographie technique Humanix (architecture.md interne)",
          filter: { type: "evidence.architecture_map" },
        },
      ],
      scopeNote:
        "Couvert pour la plateforme Humanix (architecture.md, schéma souverain Scaleway). Côté client : hors scope plateforme, mais Humanix sensibilise via saison cyber-dirigeants.",
    },
    {
      ref: "M6",
      name: "Maîtriser les flux et accès aux composants tiers (cartographie applicative)",
      category: "II. Connaître le SI",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Inventaire dépendances + Stack EOL tracking (interne)",
          filter: { type: "evidence.stack_eol" },
        },
      ],
      scopeNote:
        "Plateforme Humanix : doc STACK_EOL_TRACKING.md interne (dépendances Next.js, Prisma, Node, HAProxy, Scaleway). Client : hors scope plateforme.",
    },
    {
      ref: "M7",
      name: "Disposer d'un inventaire exhaustif des comptes privilégiés et le maintenir à jour",
      category: "II. Connaître le SI",
      artifacts: [
        {
          type: "report",
          source: "audit_trail",
          label:
            "Inventaire comptes privilégiés (/superadmin/admins-by-tenant)",
          filter: { role: "ADMIN_RSSI_SUPERADMIN" },
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Journal des changements de rôle + memberships croisées",
          filter: { type: "USER_ROLE_CHANGED" },
        },
      ],
      thresholdCompliant: 0.95,
      scopeNote:
        "★ COUVERT NATIVEMENT. Page /superadmin/admins-by-tenant liste tous comptes ADMIN/RSSI/SUPERADMIN par tenant + TenantMembership croisées. Export CSV pour audit annuel. Tout changement de rôle audité (table Event, rétention 1 an).",
    },
    {
      ref: "M8",
      name: "Rédiger des procédures d'arrivée et de départ des utilisateurs (privilèges, droits, matériels, secrets)",
      category: "II. Connaître le SI",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion saison cyber-rh (onboarding/offboarding)",
          filter: { saison: "cyber-rh" },
        },
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Module depart-entreprise-donnees déployé",
          filter: { slug: "06-depart-entreprise-donnees" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M9",
      name: "Limiter le nombre d'accès Internet de l'entreprise au strict nécessaire",
      category: "II. Connaître le SI",
      artifacts: [],
      scopeNote:
        "Hors scope Humanix : dépend de l'architecture réseau client (firewalls, proxy DNS, etc.).",
    },
    {
      ref: "M10",
      name: "Interdire la connexion d'équipements personnels au système d'information de l'entité",
      category: "II. Connaître le SI",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion saison byod-perso-pro",
          filter: { saison: "byod-perso-pro" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },

    // -------------------------------------------------------------------------
    // III. Authentifier et controler les acces
    // -------------------------------------------------------------------------
    {
      ref: "M11",
      name: "Identifier chaque individu accédant au système par un identifiant nominatif",
      category: "III. Authentifier et contrôler les accès",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label:
            "Comptes nominatifs (User.email unique, pas de comptes partagés)",
        },
      ],
      thresholdCompliant: 1.0,
      scopeNote:
        "★ COUVERT NATIVEMENT. Schéma Prisma : User.email @unique = pas de doublon, pas de compte partagé techniquement possible. Chaque action est tracée à un user nominatif (Event.userId).",
    },
    {
      ref: "M12",
      name: "Attribuer les bons droits sur les ressources sensibles du SI",
      category: "III. Authentifier et contrôler les accès",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Hiérarchie RBAC respectée (canActOn, role-hierarchy.ts)",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Journal des changements de droits",
          filter: { type: "USER_ROLE_CHANGED" },
        },
      ],
      thresholdCompliant: 1.0,
      scopeNote:
        "★ COUVERT NATIVEMENT. lib/role-hierarchy.ts impose : LEARNER < MANAGER < RSSI < ADMIN < SUPERADMIN. Un MANAGER ne peut pas modifier un ADMIN ni un SUPERADMIN. Toute escalade refusée est auditée.",
    },
    {
      ref: "M13",
      name: "Définir et vérifier des règles de choix et de dimensionnement des mots de passe",
      category: "III. Authentifier et contrôler les accès",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion modules mots de passe / phrases passe",
          filter: { category: "auth" },
        },
        {
          type: "document",
          source: "audit_trail",
          label: "Politique MDP appliquée côté plateforme (lib/password.ts)",
          filter: { type: "evidence.password_policy" },
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
      scopeNote:
        "Plateforme : lib/password.ts impose min 12 caractères, dérivation scrypt. Pédagogique : modules dédiés dans plusieurs saisons.",
    },
    {
      ref: "M14",
      name: "Protéger les mots de passe stockés sur les systèmes",
      category: "III. Authentifier et contrôler les accès",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Hash scrypt RFC 7914 (N=2^15, r=8, p=1, sel 32B aleatoire)",
          filter: { type: "evidence.password_hash" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. lib/password.ts utilise scrypt (RFC 7914), paramètres conformes recommandations CNIL/ANSSI. Aucun mot de passe en clair, jamais.",
    },
    {
      ref: "M15",
      name: "Changer les éléments d'authentification par défaut sur les équipements et services",
      category: "III. Authentifier et contrôler les accès",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Module sensibilisation mots de passe par défaut déployé",
          filter: { slug: "credentials-default" },
        },
        {
          type: "document",
          source: "audit_trail",
          label: "Procédure rotation secrets Humanix (interne)",
          filter: { type: "evidence.secret_rotation" },
        },
      ],
      scopeNote:
        "Plateforme : rotation AUTH_SECRET / clés signature / DB credentials via procédure interne. Pédagogique : modules dédiés.",
    },
    {
      ref: "M16",
      name: "Privilégier lorsque c'est possible une authentification forte",
      category: "III. Authentifier et contrôler les accès",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Taux d'utilisateurs MFA actif (TOTP + WebAuthn)",
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion saison mfa / clefs-securite",
          filter: { saison: "mfa" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
      scopeNote:
        "★ COUVERT NATIVEMENT. Plateforme Humanix supporte TOTP (RFC 6238) + WebAuthn FIDO2 (lib/webauthn.ts). Step-up obligatoire pour /superadmin (clé hardware exigée).",
    },

    // -------------------------------------------------------------------------
    // IV. Securiser les postes
    // -------------------------------------------------------------------------
    {
      ref: "M17",
      name: "Mettre en place un niveau de sécurité minimal sur l'ensemble du parc informatique",
      category: "IV. Sécuriser les postes",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion modules hygiène poste",
          filter: { category: "hygiene-poste" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
      scopeNote:
        "Côté sensibilisation utilisateur. Mise en oeuvre technique (durcissement OS, AV, EDR) reste côté client.",
    },
    {
      ref: "M18",
      name: "Se protéger des menaces relatives à l'utilisation de supports amovibles",
      category: "IV. Sécuriser les postes",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion saison cles-usb / supports amovibles",
          filter: { category: "supports-amovibles" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M19",
      name: "Utiliser un outil de gestion centralisée pour homogénéiser les politiques de sécurité",
      category: "IV. Sécuriser les postes",
      artifacts: [],
      scopeNote:
        "Hors scope Humanix : dépend de l'outillage SI client (MDM, GPO, Ansible, Jamf, etc.).",
    },
    {
      ref: "M20",
      name: "Activer et configurer le pare-feu local des postes de travail",
      category: "IV. Sécuriser les postes",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Module pare-feu local déployé",
          filter: { slug: "pare-feu-local" },
        },
      ],
    },
    {
      ref: "M21",
      name: "Chiffrer les données sensibles, en particulier sur le matériel potentiellement perdable",
      category: "IV. Sécuriser les postes",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label:
            "Taux complétion modules chiffrement disque / FileVault / BitLocker",
          filter: { category: "chiffrement" },
        },
      ],
      thresholdCompliant: 0.5,
      thresholdPartial: 0.2,
    },

    // -------------------------------------------------------------------------
    // V. Securiser le reseau
    // -------------------------------------------------------------------------
    {
      ref: "M22",
      name: "Segmenter le réseau et mettre en place un cloisonnement entre les zones",
      category: "V. Sécuriser le réseau",
      artifacts: [],
      scopeNote:
        "Hors scope Humanix : dépend de la topologie réseau client (VLANs, micro-segmentation, etc.).",
    },
    {
      ref: "M23",
      name: "S'assurer de la sécurité des réseaux d'accès Wi-Fi et de la séparation des usages",
      category: "V. Sécuriser le réseau",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion modules Wi-Fi public + quishing",
          filter: { category: "wifi" },
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Campagnes quishing IA (SSID Wi-Fi personnalisé)",
          filter: { type: "quishing.campaign_completed" },
        },
      ],
      thresholdCompliant: 0.5,
      thresholdPartial: 0.2,
    },
    {
      ref: "M24",
      name: "Utiliser des protocoles réseaux sécurisés dès qu'ils existent",
      category: "V. Sécuriser le réseau",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Modules sensibilisation HTTPS/TLS/SSH déployés",
          filter: { category: "protocoles" },
        },
        {
          type: "document",
          source: "audit_trail",
          label: "TLS 1.3 only sur humanix-academie.fr (test SSLLabs A+)",
          filter: { type: "evidence.tls_audit" },
        },
      ],
      scopeNote:
        "Plateforme : HTTPS partout, HSTS preload, TLS 1.3 (Triple A+ Mozilla Observatory).",
    },
    {
      ref: "M25",
      name: "Mettre en place une passerelle d'accès sécurisé à Internet",
      category: "V. Sécuriser le réseau",
      artifacts: [],
      scopeNote:
        "Hors scope Humanix : dépend du SI client (proxy filtrant, NGFW, etc.).",
    },
    {
      ref: "M26",
      name: "Cloisonner les services visibles depuis Internet du reste du système",
      category: "V. Sécuriser le réseau",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "Architecture Humanix : HAProxy bare-metal en frontal, app Next.js cloisonnée Docker",
          filter: { type: "evidence.network_segmentation" },
        },
      ],
      scopeNote:
        "Plateforme : reverse-proxy HAProxy en frontal (rate-limit, stick-table), backend Next.js isolé. Côté client : hors scope.",
    },

    // -------------------------------------------------------------------------
    // VI. Securiser l'administration
    // -------------------------------------------------------------------------
    {
      ref: "M27",
      name: "Interdire l'accès à Internet depuis les comptes ou équipements utilisés pour l'administration",
      category: "VI. Sécuriser l'administration",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label:
            "Taux complétion module poste-admin-dedie (saison securiser-administration-si)",
          filter: { slug: "01-poste-admin-dedie" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M28",
      name: "Utiliser un réseau dédié et cloisonné pour l'administration du SI",
      category: "VI. Sécuriser l'administration",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion module cloisonnement-reseau-admin",
          filter: { slug: "04-cloisonnement-reseau-admin" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M29",
      name: "Limiter au strict besoin les droits d'administration sur les postes de travail",
      category: "VI. Sécuriser l'administration",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion module audit-comptes-privilegies",
          filter: { slug: "06-audit-comptes-privilegies" },
        },
        {
          type: "event_log",
          source: "audit_trail",
          label:
            "Vérifications hiérarchie RBAC (canActOn, assertCanChangeRole)",
          filter: { type: "RBAC_HIERARCHY_VIOLATION_BLOCKED" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
      scopeNote:
        "Plateforme : hiérarchie RBAC stricte (cf. M12). Pédagogique : module dédié.",
    },

    // -------------------------------------------------------------------------
    // VII. Gerer le nomadisme
    // -------------------------------------------------------------------------
    {
      ref: "M30",
      name: "Prendre des mesures de sécurisation physique des terminaux mobiles",
      category: "VII. Gérer le nomadisme",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion saison nomadisme / mobilité",
          filter: { category: "mobilite" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M31",
      name: "Chiffrer les données sensibles transmises par voie Internet",
      category: "VII. Gérer le nomadisme",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Modules sensibilisation chiffrement transit / TLS",
          filter: { category: "chiffrement-transit" },
        },
      ],
    },
    {
      ref: "M32",
      name: "Sécuriser la connexion réseau des postes utilisés en situation de nomadisme",
      category: "VII. Gérer le nomadisme",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion modules VPN / Wi-Fi public",
          filter: { category: "teletravail" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M33",
      name: "Adopter des politiques de sécurité dédiées aux terminaux mobiles",
      category: "VII. Gérer le nomadisme",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux complétion saison byod-perso-pro",
          filter: { saison: "byod-perso-pro" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },

    // -------------------------------------------------------------------------
    // VIII. Maintenir le SI a jour
    // -------------------------------------------------------------------------
    {
      ref: "M34",
      name: "Définir une politique de mise à jour des composants du SI",
      category: "VIII. Maintenir le SI à jour",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "Politique mises à jour Humanix (Dependabot + revue mensuelle)",
          filter: { type: "evidence.update_policy" },
        },
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Module sensibilisation mises à jour utilisateurs",
          filter: { slug: "mises-a-jour-poste" },
        },
      ],
      scopeNote:
        "Plateforme : Dependabot actif, audit npm hebdomadaire, prod patchée max 7j après CVE critique.",
    },
    {
      ref: "M35",
      name: "Anticiper la fin de la maintenance des logiciels et systèmes et limiter les adhérences",
      category: "VIII. Maintenir le SI à jour",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Tracking EOL stack (STACK_EOL_TRACKING.md interne)",
          filter: { type: "evidence.stack_eol" },
        },
      ],
      scopeNote:
        "Plateforme : doc interne STACK_EOL_TRACKING.md liste pour chaque dépendance critique (Node, Postgres, Prisma, Next.js, HAProxy) la version actuelle, la date EOL, et le plan de migration.",
    },

    // -------------------------------------------------------------------------
    // IX. Superviser, auditer, reagir
    // -------------------------------------------------------------------------
    {
      ref: "M36",
      name: "Activer et configurer les journaux des composants les plus importants",
      category: "IX. Superviser, auditer, réagir",
      artifacts: [
        {
          type: "event_log",
          source: "audit_trail",
          label: "Table Event - audit trail tamper-evident (rétention 1 an)",
        },
        {
          type: "document",
          source: "audit_trail",
          label: "Logs HAProxy + applicatifs Next.js (Scaleway Object Storage)",
          filter: { type: "evidence.logs_retention" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Table Event (~20 types : auth, role change, incident, etc.). Rétention 1 an. Filtrable par tenant pour le client.",
    },
    {
      ref: "M37",
      name: "Définir et appliquer une politique de sauvegarde des composants critiques",
      category: "IX. Superviser, auditer, réagir",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "Backup quotidien Postgres + chiffrement age + FTPS Scaleway Object Storage",
          filter: { type: "evidence.backup_policy" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Backup auto pg_dump quotidien, chiffrement age (X25519), upload FTPS vers Scaleway, rétention 30 jours rolling + 12 mois mensuel. Cf. scripts/backup/.",
    },
    {
      ref: "M38",
      name: "Procéder à des contrôles et audits de sécurité réguliers puis appliquer les actions correctives",
      category: "IX. Superviser, auditer, réagir",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "Audits externes (Mozilla Observatory A+, SSLLabs A+, securityheaders.com A+) + pentest annuel",
          filter: { type: "evidence.security_audits" },
        },
      ],
      scopeNote:
        "Plateforme : Triple A+ externe (audits automatisés continus) + pentest annuel formalisé (cf. plan PENTEST_ANNUEL.md interne). Premier pentest Q3 2026.",
    },
    {
      ref: "M39",
      name: "Désigner un point de contact en sécurité des systèmes d'information et le faire connaître",
      category: "IX. Superviser, auditer, réagir",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label:
            "Point de contact sécurité : security@humanix-cybersecurity.fr + RSSI Humanix",
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Page /securite expose security@humanix-cybersecurity.fr (publique). RSSI désigné (Florian Durano) chez Humanix Cybersecurity SASU.",
    },
    {
      ref: "M40",
      name: "Définir une procédure de gestion des incidents de sécurité",
      category: "IX. Superviser, auditer, réagir",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label:
            "Procédure incident Pack NIS2 (notification CNIL 72h + ANSSI 24h/72h/1mois)",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Logs incidents déclarés + notifiés",
          filter: { type: "incident.declared" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Procédure unifiée Pack NIS2 couvre RGPD art. 33 (CNIL 72h) + NIS2 art. 23 (ANSSI). PSSI consolidée interne en complément.",
    },

    // -------------------------------------------------------------------------
    // X. Pour aller plus loin
    // -------------------------------------------------------------------------
    {
      ref: "M41",
      name: "Privilégier l'usage de produits et de services qualifiés par l'ANSSI",
      category: "X. Pour aller plus loin",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Démarche de reconnaissance ANSSI Humanix (Q4 2026)",
          filter: { type: "evidence.anssi_recognition" },
        },
      ],
      scopeNote:
        "Humanix est en démarche de reconnaissance ANSSI (objectif visibilité SecNumedu / qualification). Roadmap publique sur /certificat.",
    },
    {
      ref: "M42",
      name: "Mener une démarche de qualification ou certification sur le périmètre le plus pertinent",
      category: "X. Pour aller plus loin",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "Roadmap certification ANSSI (dossier Q4 2026, reconnaissance visée 2027)",
          filter: { type: "evidence.certification_roadmap" },
        },
      ],
      scopeNote:
        "Humanix : démarche reconnaissance ANSSI engagée. Côté client : Humanix délivre certificats individuels signés Ed25519 vérifiables cryptographiquement (preuve incontestable de formation).",
    },
  ],
  outOfScope: [
    {
      ref: "M9",
      reason:
        "Limitation des accès Internet de l'entité : dépend de l'architecture réseau client (firewalls, proxy, NGFW)",
    },
    {
      ref: "M19",
      reason:
        "Outil de gestion centralisée du parc : MDM/GPO/Ansible/Jamf côté client",
    },
    {
      ref: "M22",
      reason:
        "Segmentation réseau / VLANs : dépend de la topologie réseau client",
    },
    {
      ref: "M25",
      reason:
        "Passerelle Internet sécurisée : NGFW / proxy filtrant côté client",
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
          label: "Complétion - admins/managers",
          filter: { role: "ADMIN_OR_MANAGER" },
        },
      ],
    },
  ],
  outOfScope: [
    {
      ref: "ID.* / DE.* / RS.* / RC.*",
      reason:
        "Mapping NIST détaillé prévu en v1.1 - sortie initiale focus sur PR (Protect)",
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
  publisher: "République française",
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
          label: "Rapport conformité (cas fraude-president, vishing exec)",
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
      scopeNote:
        "Humanix mappe le volet humain (manipulation, ingénierie sociale, fraude au président). " +
        "Le volet financier/comptable reste à la charge des outils GRC dédiés (CISO Assistant, Eramba).",
    },
    {
      ref: "art-17-II-6",
      name: "Dispositif de formation des cadres et personnels exposés",
      category: "Mesure 6 - Formation (PILIER HUMANIX)",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de complétion saison fraude-president",
        },
        {
          type: "metric",
          source: "completion_rate",
          label:
            "Taux de complétion modules ingénierie sociale (phishing/vishing)",
        },
        {
          type: "document",
          source: "user_certificates",
          label: "Certificats individuels de formation (preuve AFA)",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Journal des complétions par utilisateur exposé",
          filter: { type: "module.completed" },
        },
      ],
      thresholdCompliant: 0.8,
      thresholdPartial: 0.5,
      scopeNote:
        "ARTICLE CENTRAL POUR HUMANIX. La saison 'fraude-president' (6 modules : " +
        "mécanisme, faux virement, changement RIB, deepfake vocal, double validation, " +
        "cas Pathé) est le coeur du dispositif Sapin II côté sensibilisation. " +
        "Modules complémentaires : phishing ciblé exec, vishing 'fake CFO'.",
    },
    {
      ref: "art-17-II-7",
      name: "Régime disciplinaire (preuve de connaissance du régime)",
      category: "Mesure 7 - Sanction disciplinaire",
      artifacts: [
        {
          type: "document",
          source: "user_certificates",
          label:
            "Acceptation traçable de la charte cyber + fraude (timestamp + signature électronique)",
        },
      ],
      scopeNote:
        "Humanix fournit la trace tamper-proof que l'utilisateur a complété la formation et " +
        "accepte le code de conduite. Élément de preuve devant l'AFA en cas de contestation " +
        "de sanction disciplinaire pour fraude.",
    },
    {
      ref: "art-17-II-8",
      name: "Dispositif de contrôle et évaluation interne des mesures",
      category: "Mesure 8 - Contrôle interne",
      artifacts: [
        {
          type: "metric",
          source: "phishing_report_rate",
          label: "Taux de signalement phishing (= efficacité de la formation)",
        },
        {
          type: "report",
          source: "compliance_report",
          label:
            "Rapport tendance trimestriel (évolution du score d'exposition)",
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
  ],
  outOfScope: [
    {
      ref: "art-17-II-1",
      reason: "Code de conduite : rédaction juridique, hors scope SAT/HRM",
    },
    {
      ref: "art-17-II-2",
      reason:
        "Dispositif d'alerte interne (whistleblowing) : outils dédiés (Whispli, etc.)",
    },
    {
      ref: "art-17-II-4",
      reason: "Procédure d'évaluation des tiers : outils KYC/KYS dédiés",
    },
    {
      ref: "art-17-II-5",
      reason: "Contrôle comptable : ERP financier (SAP, Sage, etc.)",
    },
  ],
};

// ---------------------------------------------------------------------------
// SOC 2 (Service Organization Control 2) - AICPA Trust Services Criteria 2017
//
// Standard americain de reference pour la confiance dans les SaaS B2B.
// Demande systematiquement par les acheteurs sereieux (Fortune 500, scale-ups
// US, ETI FR avec clients US). Type I = state-in-time, Type II = sur 6+ mois.
//
// 5 Trust Services Criteria (TSC) :
//   - **Security (Common Criteria)** - OBLIGATOIRE, 33 CC : CC1-CC9
//   - Availability - optionnel
//   - Processing Integrity - optionnel
//   - Confidentiality - optionnel
//   - Privacy - optionnel
//
// Humanix couvre principalement les Common Criteria (Security) qui sont
// le coeur du standard. Mapping partiel mais honnete : on ne pretend pas
// avoir un audit SOC 2 Type II - on documente l'alignement de la
// plateforme avec les controles SOC 2 pour faciliter les due diligence
// des clients qui en font la demande.
// ---------------------------------------------------------------------------
const SOC2: FrameworkMapping = {
  ref: "SOC2",
  title: "SOC 2 - Trust Services Criteria 2017 (AICPA)",
  publisher: "AICPA (American Institute of CPAs)",
  url: "https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2",
  controls: [
    // ========================================================================
    // CC1 - Control Environment (5 criteres)
    // ========================================================================
    {
      ref: "CC1.1",
      name: "L'entité démontre un engagement envers l'intégrité et les valeurs éthiques",
      category: "CC1 - Control Environment",
      artifacts: [
        {
          type: "policy",
          source: "pack_nis2_pdf",
          label: "Politique de sécurité & code de conduite (Pack NIS2)",
        },
      ],
      scopeNote:
        "Couvert par le Pack NIS2 + PSSI interne Humanix. AGPLv3 = éthique de transparence affichée publiquement.",
    },
    {
      ref: "CC1.2",
      name: "Le conseil exerce une supervision indépendante",
      category: "CC1 - Control Environment",
      artifacts: [],
      scopeNote:
        "Humanix SASU 1 personne actuellement. Gouvernance formalisée à recruter au-delà de 5 collaborateurs.",
    },
    {
      ref: "CC1.4",
      name: "L'entité recrute, développe et retient des collaborateurs compétents",
      category: "CC1 - Control Environment",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de complétion sensibilisation collaborateurs",
        },
      ],
      thresholdCompliant: 0.9,
      thresholdPartial: 0.5,
      scopeNote:
        "Côté client : taux de formation cyber des collaborateurs. Côté Humanix : politique RH d'onboarding/offboarding (PSSI section 4.1).",
    },

    // ========================================================================
    // CC2 - Communication and Information (3 criteres)
    // ========================================================================
    {
      ref: "CC2.1",
      name: "L'entité obtient ou génère de l'information pertinente, de qualité, pour supporter le fonctionnement des contrôles",
      category: "CC2 - Communication and Information",
      artifacts: [
        {
          type: "event_log",
          source: "audit_trail",
          label: "Table Event - audit trail tamper-evident",
        },
        {
          type: "metric",
          source: "tenant_score",
          label: "Score de maturité cyber humaine",
        },
      ],
      scopeNote:
        "Couvert : audit trail + dashboard tenant en temps réel + exports OSCAL.",
    },
    {
      ref: "CC2.2",
      name: "L'entité communique en interne l'information nécessaire au fonctionnement des contrôles",
      category: "CC2 - Communication and Information",
      artifacts: [
        {
          type: "policy",
          source: "pack_nis2_pdf",
          label: "Pack NIS2 - politique cybersécurité",
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux d'engagement sensibilisation",
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
    },
    {
      ref: "CC2.3",
      name: "L'entité communique avec les parties externes les sujets relatifs aux contrôles internes",
      category: "CC2 - Communication and Information",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "Page publique /securite + /architecture + /conformite/anssi-hg",
          filter: { type: "evidence.public_trust_center" },
        },
        {
          type: "document",
          source: "audit_trail",
          label: "security.txt RFC 9116 (security@humanix-cybersecurity.fr)",
          filter: { type: "evidence.security_txt" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Trust Center public, security.txt, code AGPLv3 auditable, page conformité 42 mesures ANSSI HG générée dynamiquement.",
    },

    // ========================================================================
    // CC3 - Risk Assessment (4 criteres)
    // ========================================================================
    {
      ref: "CC3.1",
      name: "L'entité spécifie ses objectifs avec suffisamment de clarté pour identifier et évaluer les risques",
      category: "CC3 - Risk Assessment",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "PSSI Humanix - section 3 objectifs sécurité",
          filter: { type: "evidence.pssi" },
        },
      ],
      scopeNote: "PSSI interne formalisée, revue annuelle minimum.",
    },
    {
      ref: "CC3.2",
      name: "L'entité identifie les risques et détermine comment les gérer",
      category: "CC3 - Risk Assessment",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "Audit ANSSI HG 42 mesures + pentest annuel + STACK_EOL_TRACKING",
          filter: { type: "evidence.risk_assessment" },
        },
      ],
      scopeNote:
        "Triple approche : conformité réglementaire (ANSSI HG), pentest offensif (PASSI annuel), gestion technique EOL.",
    },

    // ========================================================================
    // CC4 - Monitoring Activities (2 criteres)
    // ========================================================================
    {
      ref: "CC4.1",
      name: "L'entité sélectionne, développe et exécute des évaluations continues et/ou séparées",
      category: "CC4 - Monitoring Activities",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "Triple A+ continu (Mozilla Observatory + SSLLabs + securityheaders.com)",
          filter: { type: "evidence.continuous_monitoring" },
        },
        {
          type: "document",
          source: "audit_trail",
          label: "Plan pentest annuel PASSI (cf. PLAN_PENTEST_ANNUEL interne)",
          filter: { type: "evidence.pentest_plan" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Audits automatisés continus + pentest annuel formalisé (premier Q3 2026).",
    },
    {
      ref: "CC4.2",
      name: "L'entité évalue et communique les déficiences de contrôle interne en temps opportun",
      category: "CC4 - Monitoring Activities",
      artifacts: [
        {
          type: "event_log",
          source: "audit_trail",
          label: "Audit trail Event - alertes incidents et changements de rôle",
          filter: { type: "incident.declared" },
        },
      ],
    },

    // ========================================================================
    // CC5 - Control Activities (3 criteres)
    // ========================================================================
    {
      ref: "CC5.1",
      name: "L'entité sélectionne et développe des activités de contrôle qui contribuent à la maîtrise des risques",
      category: "CC5 - Control Activities",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "RBAC hiérarchique (lib/role-hierarchy.ts) + multi-tenant isolation",
          filter: { type: "evidence.rbac" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Hiérarchie LEARNER < MANAGER < RSSI < ADMIN < SUPERADMIN, isolation tenant stricte.",
    },
    {
      ref: "CC5.3",
      name: "L'entité déploie des contrôles via des politiques et des procédures",
      category: "CC5 - Control Activities",
      artifacts: [
        {
          type: "policy",
          source: "pack_nis2_pdf",
          label: "Pack NIS2 + PSSI interne + procédures incident",
        },
      ],
    },

    // ========================================================================
    // CC6 - Logical and Physical Access (8 criteres - le plus important !)
    // ========================================================================
    {
      ref: "CC6.1",
      name: "L'entité implémente des mesures de contrôle d'accès logiques pour protéger les données et systèmes",
      category: "CC6 - Logical and Physical Access",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "MFA TOTP + WebAuthn FIDO2 + step-up auth admin",
          filter: { category: "auth" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Auth.js v5, MFA obligatoire admins, WebAuthn pour SUPERADMIN, scrypt RFC 7914 pour les MDP.",
    },
    {
      ref: "CC6.2",
      name: "Avant d'octroyer l'accès, l'entité enregistre, autorise et identifie les nouveaux utilisateurs",
      category: "CC6 - Logical and Physical Access",
      artifacts: [
        {
          type: "event_log",
          source: "audit_trail",
          label: "Logs USER_INVITED + USER_CREATED + USER_ROLE_CHANGED",
          filter: { type: "USER_INVITED" },
        },
      ],
      scopeNote:
        "Tout cycle de vie utilisateur audité (création, rôle, suspension, suppression).",
    },
    {
      ref: "CC6.3",
      name: "L'entité autorise, modifie ou retire l'accès en fonction des rôles et responsabilités",
      category: "CC6 - Logical and Physical Access",
      artifacts: [
        {
          type: "report",
          source: "audit_trail",
          label:
            "Inventaire comptes privilégiés (/superadmin/admins-by-tenant)",
          filter: { role: "ADMIN_RSSI_SUPERADMIN" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Cf. mesure 7 ANSSI HG : inventaire exhaustif + export CSV + détection dormants.",
    },
    {
      ref: "CC6.6",
      name: "L'entité implémente des contrôles pour protéger contre les menaces depuis l'extérieur du périmètre",
      category: "CC6 - Logical and Physical Access",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "HAProxy frontal + rate-limit + WAF léger + HSTS preload + CSP nonce",
          filter: { type: "evidence.network_defense" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Défense en profondeur réseau + applicative.",
    },
    {
      ref: "CC6.7",
      name: "L'entité restreint la transmission, le mouvement et la suppression de données aux objectifs autorisés",
      category: "CC6 - Logical and Physical Access",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "TLS 1.3 only + chiffrement age backup + isolation multi-tenant Prisma",
          filter: { type: "evidence.data_protection" },
        },
      ],
    },
    {
      ref: "CC6.8",
      name: "L'entité implémente des contrôles pour prévenir ou détecter et agir sur l'introduction de logiciels malveillants",
      category: "CC6 - Logical and Physical Access",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "Dependabot + npm audit hebdo + scan secrets en CI + provenance SLSA + SBOM",
          filter: { type: "evidence.supply_chain" },
        },
      ],
      scopeNote:
        "Couverture supply chain : alertes deps + scan secrets + provenance Docker.",
    },

    // ========================================================================
    // CC7 - System Operations (5 criteres)
    // ========================================================================
    {
      ref: "CC7.1",
      name: "L'entité utilise des procédures de détection pour identifier les changements de configuration et les vulnérabilités",
      category: "CC7 - System Operations",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Monitoring Scaleway Cockpit + logs HAProxy + alertes prod",
          filter: { type: "evidence.monitoring" },
        },
      ],
    },
    {
      ref: "CC7.2",
      name: "L'entité surveille les composants du système et l'environnement pour les anomalies",
      category: "CC7 - System Operations",
      artifacts: [
        {
          type: "event_log",
          source: "audit_trail",
          label:
            "Détection bursts admin / exfiltration en masse (sprint 3 pentest)",
          filter: { type: "anomaly.detected" },
        },
      ],
      scopeNote:
        "Sprint 3 pentest : rate-limit endpoints /api/admin/*/export + détection > 100 req/60s.",
    },
    {
      ref: "CC7.3",
      name: "L'entité évalue les événements de sécurité et détermine s'ils constituent un incident",
      category: "CC7 - System Operations",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label: "Procédure incident Pack NIS2 (qualification < 1h)",
        },
      ],
    },
    {
      ref: "CC7.4",
      name: "L'entité répond aux incidents de sécurité identifiés en exécutant un programme de réponse",
      category: "CC7 - System Operations",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label:
            "Procédure incident unifiée (CNIL 72h + ANSSI 24h/72h/1mois + client < 24h)",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Logs incident.declared + incident.notified",
          filter: { type: "incident.declared" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Procédure formalisée + tests tabletop annuels.",
    },
    {
      ref: "CC7.5",
      name: "L'entité identifie, développe et implémente les activités pour se remettre des incidents",
      category: "CC7 - System Operations",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Backup quotidien chiffré age + test restauration trimestriel",
          filter: { type: "evidence.backup_policy" },
        },
      ],
    },

    // ========================================================================
    // CC8 - Change Management (1 critere)
    // ========================================================================
    {
      ref: "CC8.1",
      name: "L'entité autorise, conçoit, développe ou se procure, configure, documente, teste, approuve et implémente les changements",
      category: "CC8 - Change Management",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "PR review obligatoire + CI/CD + tests automatisés Vitest + Production build",
          filter: { type: "evidence.change_management" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Branches protégées main/develop, review obligatoire, CI verte requise, deploy manuel.",
    },

    // ========================================================================
    // CC9 - Risk Mitigation (2 criteres)
    // ========================================================================
    {
      ref: "CC9.1",
      name: "L'entité identifie, sélectionne et développe des activités pour atténuer les risques liées à la perturbation des activités",
      category: "CC9 - Risk Mitigation",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label:
            "Plan de reprise + tests restauration mensuel + geo-redondance Scaleway Paris/Amsterdam",
          filter: { type: "evidence.brc_drp" },
        },
      ],
      scopeNote:
        "DRP/BCP partiel : backup + geo-redondance OK, mais test formel annuel à formaliser.",
    },
    {
      ref: "CC9.2",
      name: "L'entité évalue et gère les risques associés aux fournisseurs et partenaires",
      category: "CC9 - Risk Mitigation",
      artifacts: [
        {
          type: "policy",
          source: "dpa_pdf",
          label:
            "DPA signé avec tous les sous-traitants (Scaleway, Mollie, Mistral, OVH)",
        },
      ],
      scopeNote:
        "Tous sous-traitants UE souverains, DPA RGPD art. 28 systématique.",
    },
  ],
  outOfScope: [
    {
      ref: "A1.1-A1.3",
      reason:
        "Availability TSC : on aligne sur SLA 99% mensuel mais pas certifié SOC 2 Type II",
    },
    {
      ref: "PI1.1-PI1.5",
      reason:
        "Processing Integrity TSC : pas applicable à un SaaS de sensibilisation (pas de transactions financières critiques pour le client)",
    },
    {
      ref: "C1.1-C1.2",
      reason:
        "Confidentiality TSC : couvert via Security CC6.x. Pas de scope étendu spécifique.",
    },
    {
      ref: "P1.0-P8.1",
      reason:
        "Privacy TSC : couvert via RGPD (référentiel européen, plus strict que SOC 2 Privacy)",
    },
    {
      ref: "CC1.3, CC1.5, CC3.3, CC3.4, CC5.2",
      reason:
        "Contrôles de gouvernance entreprise spécifiques au scaling > 5 collaborateurs",
    },
    {
      ref: "CC6.4, CC6.5",
      reason:
        "Accès physique aux installations (datacenters) : délégué à Scaleway (certifié ISO 27001, ISO 50001, HDS)",
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
  SOC2,
};

export const SUPPORTED_FRAMEWORKS: FrameworkRef[] = [
  "ISO27001:2022",
  "NIS2",
  "RGPD",
  "ANSSI-HG",
  "NIST-CSF",
  "SAPIN2",
  "SOC2",
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
  // Sans seuil explicite, on ne peut PAS evaluer la conformite -> not_assessed.
  // Avant : on retournait "compliant" par defaut, ce qui faisait apparaitre
  // un controle metrique a 0% comme COMPLIANT et faussait les rapports audit
  // (CISO Assistant affichait "approved" alors que le score etait 0/100).
  // Si un controle est volontairement documentaire (la simple existence d'un
  // artifact suffit comme preuve), on lui donne des artifacts de type
  // policy/document -> isDocumentaryOnly() court-circuite avant d'appeler
  // cette fonction (cf. lib/ciso-assistant/build-bundle.ts).
  if (control.thresholdCompliant === undefined) return "not_assessed";
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
