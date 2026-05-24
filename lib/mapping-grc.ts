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
      // Metric binaire : 0 = module non deploye, 1 = deploye. Seuil 0.5 :
      // un seul module suffit a satisfaire le controle "sensibilisation
      // bureau et ecran propres" cote couverture Humanix. Le controle
      // technique (verrouillage ecran, etc.) reste hors scope.
      thresholdCompliant: 0.5,
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
  title: "ANSSI - Guide d'hygiene informatique (v2, 42 mesures)",
  publisher: "ANSSI",
  url: "https://cyber.gouv.fr/publications/guide-dhygiene-informatique",
  controls: [
    // -------------------------------------------------------------------------
    // I. Sensibiliser et former
    // -------------------------------------------------------------------------
    {
      ref: "M1",
      name: "Former les equipes operationnelles a la securite des systemes d'information",
      category: "I. Sensibiliser et former",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de completion modules admin/dev/SOC",
          filter: { audience: "admin_or_dev" },
        },
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Saisons techniques deployees (cyber-dev, securiser-administration-si)",
          filter: { audience: "operationnel" },
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
      scopeNote:
        "Couvre saisons cyber-dev (6 ep), cyber-dirigeants (6 ep), securiser-administration-si (6 ep). Cible le personnel operationnel SI.",
    },
    {
      ref: "M2",
      name: "Sensibiliser les utilisateurs aux bonnes pratiques elementaires de securite informatique",
      category: "I. Sensibiliser et former",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Score de maturite cyber humaine du tenant",
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de completion saisons fondamentales",
        },
        {
          type: "document",
          source: "user_certificates",
          label: "Certificats individuels (preuve formation)",
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
      scopeNote:
        "MESURE PHARE HUMANIX. 31 saisons / 200+ modules couvrent l'ensemble des bonnes pratiques (phishing, mots de passe, donnees sensibles, mobilite, etc.).",
    },

    // -------------------------------------------------------------------------
    // II. Connaitre le systeme d'information
    // -------------------------------------------------------------------------
    {
      ref: "M3",
      name: "Maitriser les risques de l'infogerance",
      category: "II. Connaitre le SI",
      artifacts: [
        {
          type: "policy",
          source: "dpa_pdf",
          label: "Contrat de sous-traitance DPA (art. 28 RGPD)",
        },
        {
          type: "policy",
          source: "pack_nis2_pdf",
          label: "Pack NIS2 - clauses securite prestataires",
        },
      ],
      scopeNote:
        "Humanix fournit le DPA et les clauses securite type pour encadrer les prestataires du client.",
    },
    {
      ref: "M4",
      name: "Identifier les informations et serveurs les plus sensibles et maintenir un schema du reseau",
      category: "II. Connaitre le SI",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Modules classification donnees sensibles deployes",
          filter: { slug: "classification-donnees" },
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion saison donnees-sensibles",
          filter: { saison: "donnees-sensibles" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M5",
      name: "Disposer d'une cartographie precise de l'installation informatique et la maintenir a jour",
      category: "II. Connaitre le SI",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Cartographie technique Humanix (architecture.md interne)",
          filter: { type: "evidence.architecture_map" },
        },
      ],
      scopeNote:
        "Couvert pour la plateforme Humanix (architecture.md, schema souverain Scaleway). Cote client : hors scope plateforme, mais Humanix sensibilise via saison cyber-dirigeants.",
    },
    {
      ref: "M6",
      name: "Maitriser les flux et acces aux composants tiers (cartographie applicative)",
      category: "II. Connaitre le SI",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Inventaire dependances + Stack EOL tracking (interne)",
          filter: { type: "evidence.stack_eol" },
        },
      ],
      scopeNote:
        "Plateforme Humanix : doc STACK_EOL_TRACKING.md interne (dependances Next.js, Prisma, Node, HAProxy, Scaleway). Client : hors scope plateforme.",
    },
    {
      ref: "M7",
      name: "Disposer d'un inventaire exhaustif des comptes privilegies et le maintenir a jour",
      category: "II. Connaitre le SI",
      artifacts: [
        {
          type: "report",
          source: "audit_trail",
          label: "Inventaire comptes privilegies (/superadmin/admins-by-tenant)",
          filter: { role: "ADMIN_RSSI_SUPERADMIN" },
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Journal des changements de role + memberships croisees",
          filter: { type: "USER_ROLE_CHANGED" },
        },
      ],
      thresholdCompliant: 0.95,
      scopeNote:
        "★ COUVERT NATIVEMENT. Page /superadmin/admins-by-tenant liste tous comptes ADMIN/RSSI/SUPERADMIN par tenant + TenantMembership croisees. Export CSV pour audit annuel. Tout changement de role audite (table Event, retention 1 an).",
    },
    {
      ref: "M8",
      name: "Rediger des procedures d'arrivee et de depart des utilisateurs (privileges, droits, materiels, secrets)",
      category: "II. Connaitre le SI",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion saison cyber-rh (onboarding/offboarding)",
          filter: { saison: "cyber-rh" },
        },
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Module depart-entreprise-donnees deploye",
          filter: { slug: "06-depart-entreprise-donnees" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M9",
      name: "Limiter le nombre d'acces Internet de l'entreprise au strict necessaire",
      category: "II. Connaitre le SI",
      artifacts: [],
      scopeNote:
        "Hors scope Humanix : depend de l'architecture reseau client (firewalls, proxy DNS, etc.).",
    },
    {
      ref: "M10",
      name: "Interdire la connexion d'equipements personnels au systeme d'information de l'entite",
      category: "II. Connaitre le SI",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion saison byod-perso-pro",
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
      name: "Identifier chaque individu accedant au systeme par un identifiant nominatif",
      category: "III. Authentifier et controler les acces",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Comptes nominatifs (User.email unique, pas de comptes partages)",
        },
      ],
      thresholdCompliant: 1.0,
      scopeNote:
        "★ COUVERT NATIVEMENT. Schema Prisma : User.email @unique = pas de doublon, pas de compte partage techniquement possible. Chaque action est tracee a un user nominatif (Event.userId).",
    },
    {
      ref: "M12",
      name: "Attribuer les bons droits sur les ressources sensibles du SI",
      category: "III. Authentifier et controler les acces",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Hierarchie RBAC respectee (canActOn, role-hierarchy.ts)",
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
        "★ COUVERT NATIVEMENT. lib/role-hierarchy.ts impose : LEARNER < MANAGER < RSSI < ADMIN < SUPERADMIN. Un MANAGER ne peut pas modifier un ADMIN ni un SUPERADMIN. Toute escalade refusee est auditee.",
    },
    {
      ref: "M13",
      name: "Definir et verifier des regles de choix et de dimensionnement des mots de passe",
      category: "III. Authentifier et controler les acces",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion modules mots de passe / phrases passe",
          filter: { category: "auth" },
        },
        {
          type: "document",
          source: "audit_trail",
          label: "Politique MDP appliquee cote plateforme (lib/password.ts)",
          filter: { type: "evidence.password_policy" },
        },
      ],
      thresholdCompliant: 0.7,
      thresholdPartial: 0.4,
      scopeNote:
        "Plateforme : lib/password.ts impose min 12 caracteres, derivation scrypt. Pedagogique : modules dedies dans plusieurs saisons.",
    },
    {
      ref: "M14",
      name: "Proteger les mots de passe stockes sur les systemes",
      category: "III. Authentifier et controler les acces",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Hash scrypt RFC 7914 (N=2^15, r=8, p=1, sel 32B aleatoire)",
          filter: { type: "evidence.password_hash" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. lib/password.ts utilise scrypt (RFC 7914), parametres conformes recommandations CNIL/ANSSI. Aucun mot de passe en clair, jamais.",
    },
    {
      ref: "M15",
      name: "Changer les elements d'authentification par defaut sur les equipements et services",
      category: "III. Authentifier et controler les acces",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Module sensibilisation mots de passe par defaut deploye",
          filter: { slug: "credentials-default" },
        },
        {
          type: "document",
          source: "audit_trail",
          label: "Procedure rotation secrets Humanix (interne)",
          filter: { type: "evidence.secret_rotation" },
        },
      ],
      scopeNote:
        "Plateforme : rotation AUTH_SECRET / cles signature / DB credentials via procedure interne. Pedagogique : modules dedies.",
    },
    {
      ref: "M16",
      name: "Privilegier lorsque c'est possible une authentification forte",
      category: "III. Authentifier et controler les acces",
      artifacts: [
        {
          type: "metric",
          source: "tenant_score",
          label: "Taux d'utilisateurs MFA actif (TOTP + WebAuthn)",
        },
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion saison mfa / clefs-securite",
          filter: { saison: "mfa" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
      scopeNote:
        "★ COUVERT NATIVEMENT. Plateforme Humanix supporte TOTP (RFC 6238) + WebAuthn FIDO2 (lib/webauthn.ts). Step-up obligatoire pour /superadmin (cle hardware exigee).",
    },

    // -------------------------------------------------------------------------
    // IV. Securiser les postes
    // -------------------------------------------------------------------------
    {
      ref: "M17",
      name: "Mettre en place un niveau de securite minimal sur l'ensemble du parc informatique",
      category: "IV. Securiser les postes",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion modules hygiene poste",
          filter: { category: "hygiene-poste" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
      scopeNote:
        "Cote sensibilisation utilisateur. Mise en oeuvre technique (durcissement OS, AV, EDR) reste cote client.",
    },
    {
      ref: "M18",
      name: "Se proteger des menaces relatives a l'utilisation de supports amovibles",
      category: "IV. Securiser les postes",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion saison cles-usb / supports amovibles",
          filter: { category: "supports-amovibles" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M19",
      name: "Utiliser un outil de gestion centralisee pour homogeneiser les politiques de securite",
      category: "IV. Securiser les postes",
      artifacts: [],
      scopeNote:
        "Hors scope Humanix : depend de l'outillage SI client (MDM, GPO, Ansible, Jamf, etc.).",
    },
    {
      ref: "M20",
      name: "Activer et configurer le pare-feu local des postes de travail",
      category: "IV. Securiser les postes",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Module pare-feu local deploye",
          filter: { slug: "pare-feu-local" },
        },
      ],
    },
    {
      ref: "M21",
      name: "Chiffrer les donnees sensibles, en particulier sur le materiel potentiellement perdable",
      category: "IV. Securiser les postes",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion modules chiffrement disque / FileVault / BitLocker",
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
      name: "Segmenter le reseau et mettre en place un cloisonnement entre les zones",
      category: "V. Securiser le reseau",
      artifacts: [],
      scopeNote:
        "Hors scope Humanix : depend de la topologie reseau client (VLANs, micro-segmentation, etc.).",
    },
    {
      ref: "M23",
      name: "S'assurer de la securite des reseaux d'acces Wi-Fi et de la separation des usages",
      category: "V. Securiser le reseau",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion modules Wi-Fi public + quishing",
          filter: { category: "wifi" },
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Campagnes quishing IA (SSID Wi-Fi personnalise)",
          filter: { type: "quishing.campaign_completed" },
        },
      ],
      thresholdCompliant: 0.5,
      thresholdPartial: 0.2,
    },
    {
      ref: "M24",
      name: "Utiliser des protocoles reseaux securises des qu'ils existent",
      category: "V. Securiser le reseau",
      artifacts: [
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Modules sensibilisation HTTPS/TLS/SSH deployes",
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
      name: "Mettre en place une passerelle d'acces securise a Internet",
      category: "V. Securiser le reseau",
      artifacts: [],
      scopeNote:
        "Hors scope Humanix : depend du SI client (proxy filtrant, NGFW, etc.).",
    },
    {
      ref: "M26",
      name: "Cloisonner les services visibles depuis Internet du reste du systeme",
      category: "V. Securiser le reseau",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Architecture Humanix : HAProxy bare-metal en frontal, app Next.js cloisonnee Docker",
          filter: { type: "evidence.network_segmentation" },
        },
      ],
      scopeNote:
        "Plateforme : reverse-proxy HAProxy en frontal (rate-limit, stick-table), backend Next.js isole. Cote client : hors scope.",
    },

    // -------------------------------------------------------------------------
    // VI. Securiser l'administration
    // -------------------------------------------------------------------------
    {
      ref: "M27",
      name: "Interdire l'acces a Internet depuis les comptes ou equipements utilises pour l'administration",
      category: "VI. Securiser l'administration",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion module poste-admin-dedie (saison securiser-administration-si)",
          filter: { slug: "01-poste-admin-dedie" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M28",
      name: "Utiliser un reseau dedie et cloisonne pour l'administration du SI",
      category: "VI. Securiser l'administration",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion module cloisonnement-reseau-admin",
          filter: { slug: "04-cloisonnement-reseau-admin" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M29",
      name: "Limiter au strict besoin les droits d'administration sur les postes de travail",
      category: "VI. Securiser l'administration",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion module audit-comptes-privilegies",
          filter: { slug: "06-audit-comptes-privilegies" },
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Verifications hierarchie RBAC (canActOn, assertCanChangeRole)",
          filter: { type: "RBAC_HIERARCHY_VIOLATION_BLOCKED" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
      scopeNote:
        "Plateforme : hierarchie RBAC stricte (cf. M12). Pedagogique : module dedie.",
    },

    // -------------------------------------------------------------------------
    // VII. Gerer le nomadisme
    // -------------------------------------------------------------------------
    {
      ref: "M30",
      name: "Prendre des mesures de securisation physique des terminaux mobiles",
      category: "VII. Gerer le nomadisme",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion saison nomadisme / mobilite",
          filter: { category: "mobilite" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M31",
      name: "Chiffrer les donnees sensibles transmises par voie Internet",
      category: "VII. Gerer le nomadisme",
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
      name: "Securiser la connexion reseau des postes utilises en situation de nomadisme",
      category: "VII. Gerer le nomadisme",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion modules VPN / Wi-Fi public",
          filter: { category: "teletravail" },
        },
      ],
      thresholdCompliant: 0.6,
      thresholdPartial: 0.3,
    },
    {
      ref: "M33",
      name: "Adopter des politiques de securite dediees aux terminaux mobiles",
      category: "VII. Gerer le nomadisme",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux completion saison byod-perso-pro",
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
      name: "Definir une politique de mise a jour des composants du SI",
      category: "VIII. Maintenir le SI a jour",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Politique mises a jour Humanix (Dependabot + revue mensuelle)",
          filter: { type: "evidence.update_policy" },
        },
        {
          type: "metric",
          source: "marketplace_modules",
          label: "Module sensibilisation mises a jour utilisateurs",
          filter: { slug: "mises-a-jour-poste" },
        },
      ],
      scopeNote:
        "Plateforme : Dependabot actif, audit npm hebdomadaire, prod patchee max 7j apres CVE critique.",
    },
    {
      ref: "M35",
      name: "Anticiper la fin de la maintenance des logiciels et systemes et limiter les adherences",
      category: "VIII. Maintenir le SI a jour",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Tracking EOL stack (STACK_EOL_TRACKING.md interne)",
          filter: { type: "evidence.stack_eol" },
        },
      ],
      scopeNote:
        "Plateforme : doc interne STACK_EOL_TRACKING.md liste pour chaque dependance critique (Node, Postgres, Prisma, Next.js, HAProxy) la version actuelle, la date EOL, et le plan de migration.",
    },

    // -------------------------------------------------------------------------
    // IX. Superviser, auditer, reagir
    // -------------------------------------------------------------------------
    {
      ref: "M36",
      name: "Activer et configurer les journaux des composants les plus importants",
      category: "IX. Superviser, auditer, reagir",
      artifacts: [
        {
          type: "event_log",
          source: "audit_trail",
          label: "Table Event - audit trail tamper-evident (retention 1 an)",
        },
        {
          type: "document",
          source: "audit_trail",
          label: "Logs HAProxy + applicatifs Next.js (Scaleway Object Storage)",
          filter: { type: "evidence.logs_retention" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Table Event (~20 types : auth, role change, incident, etc.). Retention 1 an. Filtrable par tenant pour le client.",
    },
    {
      ref: "M37",
      name: "Definir et appliquer une politique de sauvegarde des composants critiques",
      category: "IX. Superviser, auditer, reagir",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Backup quotidien Postgres + chiffrement age + FTPS Scaleway Object Storage",
          filter: { type: "evidence.backup_policy" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Backup auto pg_dump quotidien, chiffrement age (X25519), upload FTPS vers Scaleway, retention 30 jours rolling + 12 mois mensuel. Cf. scripts/backup/.",
    },
    {
      ref: "M38",
      name: "Proceder a des controles et audits de securite reguliers puis appliquer les actions correctives",
      category: "IX. Superviser, auditer, reagir",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Audits externes (Mozilla Observatory A+, SSLLabs A+, securityheaders.com A+) + pentest annuel",
          filter: { type: "evidence.security_audits" },
        },
      ],
      scopeNote:
        "Plateforme : Triple A+ externe (audits automatises continus) + pentest annuel formalise (cf. plan PENTEST_ANNUEL.md interne). Premier pentest Q3 2026.",
    },
    {
      ref: "M39",
      name: "Designer un point de contact en securite des systemes d'information et le faire connaitre",
      category: "IX. Superviser, auditer, reagir",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label: "Point de contact securite : security@humanix-cybersecurity.fr + RSSI Humanix",
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Page /securite expose security@humanix-cybersecurity.fr (publique). RSSI designe (Florian Durano) chez Humanix Cybersecurity SASU.",
    },
    {
      ref: "M40",
      name: "Definir une procedure de gestion des incidents de securite",
      category: "IX. Superviser, auditer, reagir",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label: "Procedure incident Pack NIS2 (notification CNIL 72h + ANSSI 24h/72h/1mois)",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Logs incidents declares + notifies",
          filter: { type: "incident.declared" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Procedure unifiee Pack NIS2 couvre RGPD art. 33 (CNIL 72h) + NIS2 art. 23 (ANSSI). PSSI consolidee interne en complement.",
    },

    // -------------------------------------------------------------------------
    // X. Pour aller plus loin
    // -------------------------------------------------------------------------
    {
      ref: "M41",
      name: "Privilegier l'usage de produits et de services qualifies par l'ANSSI",
      category: "X. Pour aller plus loin",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Demarche de reconnaissance ANSSI Humanix (Q4 2026)",
          filter: { type: "evidence.anssi_recognition" },
        },
      ],
      scopeNote:
        "Humanix est en demarche de reconnaissance ANSSI (objectif visibilite SecNumedu / qualification). Roadmap publique sur /certificat.",
    },
    {
      ref: "M42",
      name: "Mener une demarche de qualification ou certification sur le perimetre le plus pertinent",
      category: "X. Pour aller plus loin",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Roadmap certification ANSSI (dossier Q4 2026, reconnaissance visee 2027)",
          filter: { type: "evidence.certification_roadmap" },
        },
      ],
      scopeNote:
        "Humanix : demarche reconnaissance ANSSI engagee. Cote client : Humanix delivre certificats individuels signes Ed25519 verifiables cryptographiquement (preuve incontestable de formation).",
    },
  ],
  outOfScope: [
    {
      ref: "M9",
      reason:
        "Limitation des acces Internet de l'entite : depend de l'architecture reseau client (firewalls, proxy, NGFW)",
    },
    {
      ref: "M19",
      reason:
        "Outil de gestion centralisee du parc : MDM/GPO/Ansible/Jamf cote client",
    },
    {
      ref: "M22",
      reason:
        "Segmentation reseau / VLANs : depend de la topologie reseau client",
    },
    {
      ref: "M25",
      reason:
        "Passerelle Internet securisee : NGFW / proxy filtrant cote client",
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
// SOC 2 (Service Organization Control 2) — AICPA Trust Services Criteria 2017
//
// Standard americain de reference pour la confiance dans les SaaS B2B.
// Demande systematiquement par les acheteurs sereieux (Fortune 500, scale-ups
// US, ETI FR avec clients US). Type I = state-in-time, Type II = sur 6+ mois.
//
// 5 Trust Services Criteria (TSC) :
//   - **Security (Common Criteria)** — OBLIGATOIRE, 33 CC : CC1-CC9
//   - Availability — optionnel
//   - Processing Integrity — optionnel
//   - Confidentiality — optionnel
//   - Privacy — optionnel
//
// Humanix couvre principalement les Common Criteria (Security) qui sont
// le coeur du standard. Mapping partiel mais honnete : on ne pretend pas
// avoir un audit SOC 2 Type II — on documente l'alignement de la
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
      name: "L'entite demontre un engagement envers l'integrite et les valeurs ethiques",
      category: "CC1 - Control Environment",
      artifacts: [
        {
          type: "policy",
          source: "pack_nis2_pdf",
          label: "Politique de securite & code de conduite (Pack NIS2)",
        },
      ],
      scopeNote:
        "Couvert par le Pack NIS2 + PSSI interne Humanix. AGPLv3 = ethique de transparence affichee publiquement.",
    },
    {
      ref: "CC1.2",
      name: "Le conseil exerce une supervision independante",
      category: "CC1 - Control Environment",
      artifacts: [],
      scopeNote:
        "Humanix SASU 1 personne actuellement. Gouvernance formalisee a recruter au-dela de 5 collaborateurs.",
    },
    {
      ref: "CC1.4",
      name: "L'entite recrute, developpe et retient des collaborateurs competents",
      category: "CC1 - Control Environment",
      artifacts: [
        {
          type: "metric",
          source: "completion_rate",
          label: "Taux de completion sensibilisation collaborateurs",
        },
      ],
      thresholdCompliant: 0.9,
      thresholdPartial: 0.5,
      scopeNote:
        "Cote client : taux de formation cyber des collaborateurs. Cote Humanix : politique RH d'onboarding/offboarding (PSSI section 4.1).",
    },

    // ========================================================================
    // CC2 - Communication and Information (3 criteres)
    // ========================================================================
    {
      ref: "CC2.1",
      name: "L'entite obtient ou genere de l'information pertinente, de qualite, pour supporter le fonctionnement des controles",
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
          label: "Score de maturite cyber humaine",
        },
      ],
      scopeNote:
        "Couvert : audit trail + dashboard tenant en temps reel + exports OSCAL.",
    },
    {
      ref: "CC2.2",
      name: "L'entite communique en interne l'information necessaire au fonctionnement des controles",
      category: "CC2 - Communication and Information",
      artifacts: [
        {
          type: "policy",
          source: "pack_nis2_pdf",
          label: "Pack NIS2 - politique cybersecurite",
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
      name: "L'entite communique avec les parties externes les sujets relatifs aux controles internes",
      category: "CC2 - Communication and Information",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Page publique /securite + /architecture + /conformite/anssi-hg",
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
        "★ COUVERT NATIVEMENT. Trust Center public, security.txt, code AGPLv3 auditable, page conformite 42 mesures ANSSI HG generee dynamiquement.",
    },

    // ========================================================================
    // CC3 - Risk Assessment (4 criteres)
    // ========================================================================
    {
      ref: "CC3.1",
      name: "L'entite specifie ses objectifs avec suffisamment de clarte pour identifier et evaluer les risques",
      category: "CC3 - Risk Assessment",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "PSSI Humanix - section 3 objectifs securite",
          filter: { type: "evidence.pssi" },
        },
      ],
      scopeNote: "PSSI interne formalisee, revue annuelle minimum.",
    },
    {
      ref: "CC3.2",
      name: "L'entite identifie les risques et determine comment les gerer",
      category: "CC3 - Risk Assessment",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Audit ANSSI HG 42 mesures + pentest annuel + STACK_EOL_TRACKING",
          filter: { type: "evidence.risk_assessment" },
        },
      ],
      scopeNote:
        "Triple approche : conformite reglementaire (ANSSI HG), pentest offensif (PASSI annuel), gestion technique EOL.",
    },

    // ========================================================================
    // CC4 - Monitoring Activities (2 criteres)
    // ========================================================================
    {
      ref: "CC4.1",
      name: "L'entite selectionne, developpe et execute des evaluations continues et/ou separees",
      category: "CC4 - Monitoring Activities",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Triple A+ continu (Mozilla Observatory + SSLLabs + securityheaders.com)",
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
        "★ COUVERT NATIVEMENT. Audits automatises continus + pentest annuel formalise (premier Q3 2026).",
    },
    {
      ref: "CC4.2",
      name: "L'entite evalue et communique les deficiences de controle interne en temps opportun",
      category: "CC4 - Monitoring Activities",
      artifacts: [
        {
          type: "event_log",
          source: "audit_trail",
          label: "Audit trail Event - alertes incidents et changements de role",
          filter: { type: "incident.declared" },
        },
      ],
    },

    // ========================================================================
    // CC5 - Control Activities (3 criteres)
    // ========================================================================
    {
      ref: "CC5.1",
      name: "L'entite selectionne et developpe des activites de controle qui contribuent a la maitrise des risques",
      category: "CC5 - Control Activities",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "RBAC hierarchique (lib/role-hierarchy.ts) + multi-tenant isolation",
          filter: { type: "evidence.rbac" },
        },
      ],
      scopeNote: "★ COUVERT NATIVEMENT. Hierarchie LEARNER < MANAGER < RSSI < ADMIN < SUPERADMIN, isolation tenant stricte.",
    },
    {
      ref: "CC5.3",
      name: "L'entite deploie des controles via des politiques et des procedures",
      category: "CC5 - Control Activities",
      artifacts: [
        {
          type: "policy",
          source: "pack_nis2_pdf",
          label: "Pack NIS2 + PSSI interne + procedures incident",
        },
      ],
    },

    // ========================================================================
    // CC6 - Logical and Physical Access (8 criteres - le plus important !)
    // ========================================================================
    {
      ref: "CC6.1",
      name: "L'entite implemente des mesures de controle d'acces logiques pour proteger les donnees et systemes",
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
      name: "Avant d'octroyer l'acces, l'entite enregistre, autorise et identifie les nouveaux utilisateurs",
      category: "CC6 - Logical and Physical Access",
      artifacts: [
        {
          type: "event_log",
          source: "audit_trail",
          label: "Logs USER_INVITED + USER_CREATED + USER_ROLE_CHANGED",
          filter: { type: "USER_INVITED" },
        },
      ],
      scopeNote: "Tout cycle de vie utilisateur audite (creation, role, suspension, suppression).",
    },
    {
      ref: "CC6.3",
      name: "L'entite autorise, modifie ou retire l'acces en fonction des roles et responsabilites",
      category: "CC6 - Logical and Physical Access",
      artifacts: [
        {
          type: "report",
          source: "audit_trail",
          label: "Inventaire comptes privilegies (/superadmin/admins-by-tenant)",
          filter: { role: "ADMIN_RSSI_SUPERADMIN" },
        },
      ],
      scopeNote: "★ COUVERT NATIVEMENT. Cf. mesure 7 ANSSI HG : inventaire exhaustif + export CSV + detection dormants.",
    },
    {
      ref: "CC6.6",
      name: "L'entite implemente des controles pour proteger contre les menaces depuis l'exterieur du perimetre",
      category: "CC6 - Logical and Physical Access",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "HAProxy frontal + rate-limit + WAF leger + HSTS preload + CSP nonce",
          filter: { type: "evidence.network_defense" },
        },
      ],
      scopeNote: "★ COUVERT NATIVEMENT. Defense en profondeur reseau + applicative.",
    },
    {
      ref: "CC6.7",
      name: "L'entite restreint la transmission, le mouvement et la suppression de donnees aux objectifs autorises",
      category: "CC6 - Logical and Physical Access",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "TLS 1.3 only + chiffrement age backup + isolation multi-tenant Prisma",
          filter: { type: "evidence.data_protection" },
        },
      ],
    },
    {
      ref: "CC6.8",
      name: "L'entite implemente des controles pour prevenir ou detecter et agir sur l'introduction de logiciels malveillants",
      category: "CC6 - Logical and Physical Access",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Dependabot + npm audit hebdo + scan secrets en CI + provenance SLSA + SBOM",
          filter: { type: "evidence.supply_chain" },
        },
      ],
      scopeNote: "Couverture supply chain : alertes deps + scan secrets + provenance Docker.",
    },

    // ========================================================================
    // CC7 - System Operations (5 criteres)
    // ========================================================================
    {
      ref: "CC7.1",
      name: "L'entite utilise des procedures de detection pour identifier les changements de configuration et les vulnerabilites",
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
      name: "L'entite surveille les composants du systeme et l'environnement pour les anomalies",
      category: "CC7 - System Operations",
      artifacts: [
        {
          type: "event_log",
          source: "audit_trail",
          label: "Detection bursts admin / exfiltration en masse (sprint 3 pentest)",
          filter: { type: "anomaly.detected" },
        },
      ],
      scopeNote:
        "Sprint 3 pentest : rate-limit endpoints /api/admin/*/export + detection > 100 req/60s.",
    },
    {
      ref: "CC7.3",
      name: "L'entite evalue les evenements de securite et determine s'ils constituent un incident",
      category: "CC7 - System Operations",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label: "Procedure incident Pack NIS2 (qualification < 1h)",
        },
      ],
    },
    {
      ref: "CC7.4",
      name: "L'entite repond aux incidents de securite identifies en executant un programme de reponse",
      category: "CC7 - System Operations",
      artifacts: [
        {
          type: "policy",
          source: "incident_procedure",
          label: "Procedure incident unifiee (CNIL 72h + ANSSI 24h/72h/1mois + client < 24h)",
        },
        {
          type: "event_log",
          source: "audit_trail",
          label: "Logs incident.declared + incident.notified",
          filter: { type: "incident.declared" },
        },
      ],
      scopeNote: "★ COUVERT NATIVEMENT. Procedure formalisee + tests tabletop annuels.",
    },
    {
      ref: "CC7.5",
      name: "L'entite identifie, developpe et implemente les activites pour se remettre des incidents",
      category: "CC7 - System Operations",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Backup quotidien chiffre age + test restauration trimestriel",
          filter: { type: "evidence.backup_policy" },
        },
      ],
    },

    // ========================================================================
    // CC8 - Change Management (1 critere)
    // ========================================================================
    {
      ref: "CC8.1",
      name: "L'entite autorise, conçoit, developpe ou se procure, configure, documente, teste, approuve et implemente les changements",
      category: "CC8 - Change Management",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "PR review obligatoire + CI/CD + tests automatises Vitest + Production build",
          filter: { type: "evidence.change_management" },
        },
      ],
      scopeNote:
        "★ COUVERT NATIVEMENT. Branches protegees main/develop, review obligatoire, CI verte requise, deploy manuel.",
    },

    // ========================================================================
    // CC9 - Risk Mitigation (2 criteres)
    // ========================================================================
    {
      ref: "CC9.1",
      name: "L'entite identifie, selectionne et developpe des activites pour attenuer les risques liees a la perturbation des activites",
      category: "CC9 - Risk Mitigation",
      artifacts: [
        {
          type: "document",
          source: "audit_trail",
          label: "Plan de reprise + tests restauration mensuel + geo-redondance Scaleway Paris/Amsterdam",
          filter: { type: "evidence.brc_drp" },
        },
      ],
      scopeNote: "DRP/BCP partiel : backup + geo-redondance OK, mais test formel annuel a formaliser.",
    },
    {
      ref: "CC9.2",
      name: "L'entite evalue et gere les risques associes aux fournisseurs et partenaires",
      category: "CC9 - Risk Mitigation",
      artifacts: [
        {
          type: "policy",
          source: "dpa_pdf",
          label: "DPA signe avec tous les sous-traitants (Scaleway, Mollie, Mistral, OVH)",
        },
      ],
      scopeNote: "Tous sous-traitants UE souverains, DPA RGPD art. 28 systematique.",
    },
  ],
  outOfScope: [
    {
      ref: "A1.1-A1.3",
      reason:
        "Availability TSC : on aligne sur SLA 99% mensuel mais pas certifie SOC 2 Type II",
    },
    {
      ref: "PI1.1-PI1.5",
      reason:
        "Processing Integrity TSC : pas applicable a un SaaS de sensibilisation (pas de transactions financieres critiques pour le client)",
    },
    {
      ref: "C1.1-C1.2",
      reason:
        "Confidentiality TSC : couvert via Security CC6.x. Pas de scope etendu specifique.",
    },
    {
      ref: "P1.0-P8.1",
      reason:
        "Privacy TSC : couvert via RGPD (referentiel europeen, plus strict que SOC 2 Privacy)",
    },
    {
      ref: "CC1.3, CC1.5, CC3.3, CC3.4, CC5.2",
      reason:
        "Controles de gouvernance entreprise specifiques au scaling > 5 collaborateurs",
    },
    {
      ref: "CC6.4, CC6.5",
      reason:
        "Acces physique aux installations (datacenters) : delegue a Scaleway (certifie ISO 27001, ISO 50001, HDS)",
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
