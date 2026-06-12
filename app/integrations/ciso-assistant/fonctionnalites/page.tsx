// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page de reference exhaustive du connecteur CISO Assistant.
//
// Public-facing, sans auth. Cible :
//   - RSSI / DSI prospect qui evalue notre integration avant signature
//   - Admin Humanix qui veut comprendre chaque toggle de la console
//   - Equipe intuitem qui veut voir l'exhaustivite de ce qu'on alimente
//   - Auditeur ISO 27001 / NIS2 qui doit comprendre la trace cote GRC
//
// Layout : hero + stats + table des matieres + 1 section par fonctionnalite.
// Pour chaque feature : quoi, effet, version, endpoint API source.
//
// Le lien depuis /admin/integrations/ciso-assistant et /integrations/ciso-
// assistant pointe ici pour que le RSSI ait toujours la reference complete.

import Link from "next/link";

export const metadata = {
  title:
    "Connecteur CISO Assistant - Toutes les fonctionnalités | Humanix Académie",
  description:
    "Référence complète du connecteur Humanix × CISO Assistant : 17 surfaces métier alimentées, 12 interrupteurs indépendants, alignement OpenAPI, PDF signés Ed25519, synchronisation en temps réel. Tout est documenté.",
};

// ============================================================================
// Catalogue des fonctionnalités (source de vérité unique pour la page).
// ============================================================================

type Feature = {
  /** Anchor pour le sommaire (kebab-case). */
  slug: string;
  /** Titre affiché. */
  title: string;
  /** Mini-résumé pour le sommaire et la card. */
  shortDescription: string;
  /** Émoji ou symbole décoratif. */
  icon: string;
  /** Version d'introduction (v1.0 .. v2.2). */
  version: string;
  /** Nom du toggle dans l'admin console (si applicable). */
  toggleName?: string;
  /** Activé par défaut ? (sinon opt-in). */
  defaultOn?: boolean;
  /** Effet détaillé côté CISO Assistant (paragraphes ou bullets). */
  effect: React.ReactNode;
  /** Endpoint(s) API consommé(s) côté CISO Assistant. */
  endpoints: string[];
  /** Cas d'usage type - pour qui c'est utile. */
  useCase: string;
  /** Catégorie pour grouper. */
  category:
    | "core"
    | "grc"
    | "metrology"
    | "people"
    | "automation"
    | "audit";
};

const CATEGORIES: Record<
  Feature["category"],
  { label: string; description: string }
> = {
  core: {
    label: "Cœur du connecteur",
    description:
      "La transmission automatique des preuves de conformité - base obligatoire que toutes les autres fonctionnalités enrichissent.",
  },
  grc: {
    label: "Boucle GRC complète",
    description:
      "Tout ce qu'un RSSI attend dans un outil de gouvernance, risque et conformité moderne : contrôles appliqués, constats, scénarios de risque, incidents.",
  },
  metrology: {
    label: "Métriques et tableaux de bord",
    description:
      "Séries temporelles dans le module Métrologie natif et tableau de bord prêt à l'emploi pour une présentation en comité de direction.",
  },
  people: {
    label: "Couche humaine",
    description:
      "Cartographie de la dimension humaine du risque cyber : équipes, menaces, actif « personnel », responsable désigné.",
  },
  automation: {
    label: "Automatisation",
    description:
      "Mode temps réel, synchronisation planifiée, étiquettes automatiques, idempotence - pour que tout fonctionne sans intervention une fois configuré.",
  },
  audit: {
    label: "Preuve et audit",
    description:
      "Tout ce qui aide à passer un audit ISO 27001, NIS2 ou DORA : signatures cryptographiques, traçabilité, manifeste d'intégrité.",
  },
};

const FEATURES: Feature[] = [
  // ============== CORE ==============
  {
    slug: "evidences",
    title: "Preuves de conformité",
    icon: "📋",
    version: "v1.0",
    shortDescription:
      "Une preuve par contrôle, idempotente par nom, avec score, statut, période de couverture et lien vers Humanix.",
    defaultOn: true,
    effect: (
      <>
        <p>
          Pour chaque contrôle du référentiel sélectionné (ex: A.5.1 sur ISO
          27001:2022), on crée ou met à jour une <strong>Evidence</strong> côté
          CISO Assistant avec :
        </p>
        <ul>
          <li>
            <strong>Nom</strong> stable :{" "}
            <code>Humanix · &lt;control_ref&gt; · &lt;control_name&gt;</code>
          </li>
          <li>
            <strong>Description Markdown</strong> en 2 blocs : « Métadonnées
            audit » (ISO 27001 §7.5 : référentiel, contrôle, responsable,
            période, version Humanix, ré-évaluation) puis « Données Humanix »
            (score, statut, source).
          </li>
          <li>
            <strong>Statut</strong> mappé sur l'enum CISO Assistant :{" "}
            <code>compliant→approved</code>, <code>partial→in_review</code>,{" "}
            <code>non_compliant→rejected</code>,{" "}
            <code>not_assessed→draft</code>.
          </li>
          <li>
            <strong>Lien direct</strong> vers la page Humanix qui prouve la
            mesure (chiffres en clair, drill-down par groupe).
          </li>
          <li>
            <strong>Date d'expiration</strong> à +12 mois (réaudit annuel par
            défaut).
          </li>
        </ul>
      </>
    ),
    endpoints: [
      "GET /api/evidences/?folder={folderId}",
      "POST /api/evidences/",
      "PATCH /api/evidences/{id}/",
    ],
    useCase:
      "Le RSSI prépare son audit ISO 27001 et veut une trace fraîche par contrôle, sans copier-coller manuel ni Excel partagé.",
    category: "core",
  },
  {
    slug: "pdf-signes",
    title: "PDF signés Ed25519",
    icon: "🔏",
    version: "v1.2",
    shortDescription:
      "Chaque preuve est accompagnée d'un PDF prêt à l'audit, signé cryptographiquement, et vérifiable hors-ligne avec OpenSSL standard.",
    defaultOn: true,
    effect: (
      <>
        <p>
          À chaque sync, pour chaque evidence on génère un PDF 2 pages A4
          attaché :
        </p>
        <ul>
          <li>
            <strong>Page 1</strong> : metadata d'audit (contrôle, responsable,
            période) + données Humanix (chiffres, capture du dashboard).
          </li>
          <li>
            <strong>Page 2</strong> : manifeste d'intégrité avec signature
            Ed25519 du payload JSON canonique, empreinte de la clé publique,
            timestamp UTC, et procédure OpenSSL de vérification hors-ligne.
          </li>
        </ul>
        <p>
          La clé publique Humanix est exposée sur{" "}
          <Link
            href="/.well-known/humanix-pdf-pubkey.pem"
            className="text-primary-500 underline"
          >
            /.well-known/humanix-pdf-pubkey.pem
          </Link>{" "}
          - un auditeur peut vérifier l'authenticité de n'importe quelle
          evidence sans contacter Humanix.
        </p>
      </>
    ),
    endpoints: ["POST /api/evidences/{id}/attachment/"],
    useCase:
      "L'auditeur certifie une preuve sans avoir à demander d'accès à votre instance Humanix. Indépendance totale de la chaîne de confiance.",
    category: "audit",
  },
  // ============== GRC ==============
  {
    slug: "applied-control",
    title: "AppliedControl agrégateur",
    icon: "🛡",
    version: "v1.3",
    shortDescription:
      "Un contrôle appliqué « Programme de sensibilisation Humanix » regroupe toutes les preuves transmises, avec la catégorie « processus », csf_function=protect et un effort de niveau L.",
    toggleName: "createAppliedControls",
    effect: (
      <>
        <p>
          Crée un AppliedControl{" "}
          <em>« Programme de sensibilisation Humanix Académie · &lt;framework&gt; »</em>
          {" "}avec sémantique NIST CSF 2.0 :
        </p>
        <ul>
          <li>
            <code>category: process</code>
          </li>
          <li>
            <code>csf_function: protect</code> (sensibilisation = protection
            comportementale)
          </li>
          <li>
            <code>priority: 3</code>, <code>effort: L</code> (programme
            continu)
          </li>
          <li>
            <code>eta: +12 mois</code> - date du prochain audit
          </li>
        </ul>
        <p>
          À la fin du sync, on lie M2M les 7 evidences à cet AppliedControl
          (champ <code>evidences</code>). Le RSSI a un point de bascule unique
          dans l'arbre GRC.
        </p>
      </>
    ),
    endpoints: [
      "GET /api/applied-controls/?folder={folderId}",
      "POST /api/applied-controls/",
      "PATCH /api/applied-controls/{id}/ (link M2M)",
    ],
    useCase:
      "Le RSSI veut une vue \"un contrôle ↔ N evidences\" propre dans la matrice de conformité, pas 7 evidences orphelines.",
    category: "grc",
  },
  {
    slug: "findings",
    title: "Findings actionnables",
    icon: "🔍",
    version: "v1.3",
    shortDescription:
      "Chaque contrôle partiel ou non conforme génère un constat de priorité 1 ou 2, avec une échéance à 12 mois et un lien vers le contrôle appliqué parent.",
    toggleName: "createFindings",
    effect: (
      <>
        <p>
          Pour chaque contrôle en <code>partial</code> ou{" "}
          <code>non_compliant</code>, on crée un Finding sous un
          FindingsAssessment dédié{" "}
          <em>« Audit sensibilisation Humanix Académie · &lt;framework&gt; »</em>{" "}
          (catégorie <code>self_identified</code>) :
        </p>
        <ul>
          <li>
            <strong>Priorité</strong> : <code>P1</code> si non_compliant,{" "}
            <code>P2</code> si partial
          </li>
          <li>
            <strong>Statut</strong> : <code>confirmed</code> (non_compliant)
            ou <code>identified</code> (partial)
          </li>
          <li>
            <strong>ETA & due_date</strong> : +12 mois
          </li>
          <li>
            <strong>Lien</strong> vers l'AppliedControl agrégateur (M2M)
          </li>
          <li>
            <strong>Owner</strong> : User CISO Assistant correspondant à
            l'<code>ownerEmail</code> du tenant (si toggle owner actif)
          </li>
        </ul>
      </>
    ),
    endpoints: [
      "POST /api/findings-assessments/",
      "POST /api/findings/",
      "PATCH /api/findings/{id}/",
    ],
    useCase:
      "Le RSSI veut une todo-list actionnable plutôt qu'une liste plate d'écarts. Findings = plan de remédiation packagé.",
    category: "grc",
  },
  {
    slug: "risk-scenarios",
    title: "RiskScenarios déclenchés",
    icon: "⚖",
    version: "v1.4",
    shortDescription:
      "Si plus de 30 % du panel est non conforme ou si au moins deux contrôles sont affaiblis, on crée un scénario « Compromission via couche humaine sous-formée » sous une analyse de risque dédiée.",
    toggleName: "createRiskScenarios",
    effect: (
      <>
        <p>
          Triggers déclenchés à l'analyse du bundle :
        </p>
        <ul>
          <li>
            <strong>{">"} 30%</strong> des contrôles non_compliant
          </li>
          <li>
            <strong>≥2</strong> contrôles partial
          </li>
          <li>
            <strong>Déclenchement précoce</strong> : 2+ contrôles affaiblis
            (partial OU non_compliant)
          </li>
        </ul>
        <p>
          On crée un <code>RiskAssessment</code> Humanix puis un{" "}
          <code>RiskScenario</code> avec <code>treatment=mitigate</code>,{" "}
          <code>current_proba=2</code>, <code>current_impact=2</code>{" "}
          (compatible matrices 3×3 et 5×5). Nécessite qu'une RiskMatrix soit
          chargée côté CISO Assistant.
        </p>
      </>
    ),
    endpoints: [
      "GET /api/risk-matrices/",
      "POST /api/risk-assessments/",
      "POST /api/risk-scenarios/",
    ],
    useCase:
      "Le RSSI veut une alerte automatique quand la couche humaine présente un signal d'alerte - sans avoir à scruter manuellement les dashboards.",
    category: "grc",
  },
  {
    slug: "incidents",
    title: "Incidents de signal d'alerte",
    icon: "🚨",
    version: "v1.6",
    shortDescription:
      "Quand au moins un contrôle est non conforme, on ouvre un incident de sévérité 3 « Risque humain » avec date de signalement et date d'occurrence, idempotent à la journée.",
    toggleName: "createIncidents",
    effect: (
      <>
        <p>
          Pas une déclaration formelle d'incident - c'est un constat d'écart
          automatique pour la traçabilité audit ISO 27001 §10.1 / NIS2 §21.2.g
          :
        </p>
        <ul>
          <li>
            <code>status: new</code>, <code>severity: 3</code> (Moderate),{" "}
            <code>detection: internally_detected</code>
          </li>
          <li>
            <code>reported_at</code> + <code>occurred_at</code> = now (ISO
            datetime)
          </li>
          <li>
            <code>ref_id</code> :{" "}
            <code>humanix-&lt;framework&gt;-YYYY-MM-DD</code> (idempotent par
            jour)
          </li>
          <li>
            <code>owners</code> : User CISO Assistant si syncOwnerAsActor
            actif
          </li>
        </ul>
      </>
    ),
    endpoints: [
      "GET /api/incidents/?folder={folderId}",
      "POST /api/incidents/",
      "PATCH /api/incidents/{id}/",
    ],
    useCase:
      "Le RSSI a un historique d'incidents typé NIS2 généré automatiquement quand le score tombe - utile pour démontrer la conformité §23 en cas d'audit.",
    category: "grc",
  },
  // ============== METROLOGY ==============
  {
    slug: "metrology",
    title: "Séries temporelles Metrology",
    icon: "📈",
    version: "v1.7",
    shortDescription:
      "Six définitions de métriques Humanix avec leur unité (score, pourcentage, comptage), fournisseur Humanix Académie, étiquettes de filtrage, et un échantillon temporel par synchronisation.",
    toggleName: "pushMetrologySamples",
    effect: (
      <>
        <p>
          Pour chaque sync, on push 6 séries temporelles via le module
          Metrology natif de CISO Assistant :
        </p>
        <ul>
          <li>
            <code>humanix.tenant_score</code> - score maturité 0-100 (
            <em>Score</em>)
          </li>
          <li>
            <code>humanix.completion_rate</code> - taux complétion 0-100% (
            <em>Percentage (%)</em>)
          </li>
          <li>
            <code>humanix.phishing_report_rate</code> - taux signalement
            phishing 0-100% (<em>Percentage (%)</em>)
          </li>
          <li>
            <code>humanix.evidences_compliant_count</code> - N contrôles
            conformes (<em>Count</em>)
          </li>
          <li>
            <code>humanix.evidences_non_compliant_count</code> - N non
            conformes (<em>Count</em>)
          </li>
          <li>
            <code>humanix.evidences_partial_count</code> - N partiels (
            <em>Count</em>)
          </li>
        </ul>
        <p>
          Chaque MetricDefinition est créée avec son unité résolue
          dynamiquement (lookup{" "}
          <code>/api/terminologies/?field_path=metric_definition.unit</code>),
          son <code>provider</code> Humanix Académie, et les 3{" "}
          <code>filtering_labels</code> standards (<code>humanix</code>,{" "}
          <code>sensibilisation</code>, <code>&lt;framework&gt;</code>).
        </p>
      </>
    ),
    endpoints: [
      "GET /api/terminologies/?field_path=metric_definition.unit",
      "POST /api/metrology/metric-definitions/",
      "POST /api/metrology/metric-instances/",
      "POST /api/metrology/custom-metric-samples/",
    ],
    useCase:
      "Le DSI / DPO visualise l'évolution mensuelle des KPI cyber humains directement dans les dashboards natifs CISO Assistant, sans quitter son outil.",
    category: "metrology",
  },
  {
    slug: "dashboard",
    title: "Dashboard « Cockpit Humanix »",
    icon: "📊",
    version: "v2.2",
    shortDescription:
      "Tableau de bord prêt à l'emploi avec six vignettes : une jauge pour le score, deux indicateurs clés, une courbe sur 90 jours, deux mini-graphes. Le RSSI ouvre CISO Assistant et voit déjà du contenu.",
    toggleName: "createDashboard",
    effect: (
      <>
        <p>
          Un Dashboard{" "}
          <em>« Cockpit Humanix Académie · &lt;framework&gt; »</em> avec 6
          widgets pointant sur les MetricInstances :
        </p>
        <ul>
          <li>
            <strong>Gauge</strong> - Score maturité cyber humaine
          </li>
          <li>
            <strong>KPI card</strong> - Taux de complétion sensibilisation
          </li>
          <li>
            <strong>KPI card</strong> - Taux signalement phishing
          </li>
          <li>
            <strong>Line chart</strong> 90 jours - Évolution score
          </li>
          <li>
            <strong>Sparkline</strong> - Tendance contrôles non conformes
          </li>
          <li>
            <strong>Sparkline</strong> - Tendance contrôles conformes
          </li>
        </ul>
        <p>
          Layout 12-col propre. Nécessite{" "}
          <code>pushMetrologySamples</code> actif (sinon les widgets n'ont
          pas de cible).
        </p>
      </>
    ),
    endpoints: [
      "POST /api/metrology/dashboards/",
      "POST /api/metrology/dashboard-widgets/",
    ],
    useCase:
      "En présentation COMEX, le RSSI partage son écran sur CISO Assistant → Dashboards et présente immédiatement la vue cyber humaine. Zéro setup, zéro Excel.",
    category: "metrology",
  },
  // ============== PEOPLE ==============
  {
    slug: "owner",
    title: "Owner désigné (RSSI / DPO)",
    icon: "👤",
    version: "v1.5",
    shortDescription:
      "Crée l'utilisateur CISO Assistant correspondant à l'adresse du responsable, et l'affecte automatiquement comme responsable sur toutes les preuves, constats, scénarios de risque, incidents, métriques et actifs.",
    toggleName: "syncOwnerAsActor",
    effect: (
      <>
        <p>
          Si l'<code>ownerEmail</code> du tenant est renseigné, on appelle{" "}
          <code>resolveOwnerUser(email)</code> qui :
        </p>
        <ol>
          <li>
            Cherche l'utilisateur par email côté CISO Assistant
          </li>
          <li>
            Le crée s'il n'existe pas (
            <code>POST /api/users/ {`{ email, is_active: true, is_third_party: false }`}</code>
            )
          </li>
          <li>
            Retourne le User UUID (<strong>pas</strong> Actor UUID - le
            schéma OpenAPI confirme que les champs <code>owner</code>{" "}
            attendent des User refs)
          </li>
        </ol>
        <p>
          Le User est ensuite injecté dans le champ <code>owner</code>{" "}
          (singulier) sur les evidences, applied controls, findings, risk
          scenarios, metric instances et asset workforce, et dans{" "}
          <code>owners</code> (pluriel) sur les incidents.
        </p>
      </>
    ),
    endpoints: ["GET /api/users/?email={email}", "POST /api/users/"],
    useCase:
      "Exigence audit ISO 27001 §7.5 : chaque preuve doit avoir un responsable nommé. Le toggle permet de respecter cette exigence sans pop-up manuel.",
    category: "people",
  },
  {
    slug: "teams",
    title: "Équipes (Groups → Teams)",
    icon: "👥",
    version: "v1.8",
    shortDescription:
      "Synchronise les groupes Humanix (Comptabilité, RH, Développement, Commercial…) en équipes CISO Assistant. Le RSSI peut affecter les constats et les incidents par équipe, nativement.",
    toggleName: "syncGroupsAsTeams",
    effect: (
      <>
        <p>
          Pour chaque Group Humanix actif (<code>isActive: true</code>), on
          crée une Team CISO Assistant nommée{" "}
          <code>Humanix · &lt;Group.name&gt;</code> dans le folder. Idempotent
          par nom.
        </p>
        <p>
          Description auto-générée :{" "}
          <em>
            « Équipe Compta (12 membres) synchronisée automatiquement depuis
            Humanix Académie. »
          </em>
        </p>
        <p>
          Les membres ne sont <strong>pas pushés automatiquement</strong> -
          c'est le RSSI qui assigne nominativement (besoin d'un User CISO
          Assistant par membre, hors scope du connecteur).
        </p>
      </>
    ),
    endpoints: [
      "GET /api/teams/?folder={folderId}",
      "POST /api/teams/",
      "PATCH /api/teams/{id}/",
    ],
    useCase:
      "Le RSSI veut assigner ses findings par équipe (Compta, RH…) plutôt qu'au tenant entier. Permet de cibler les actions de remédiation.",
    category: "people",
  },
  {
    slug: "asset-workforce",
    title: "Asset « Workforce »",
    icon: "🧍",
    version: "v2.2",
    shortDescription:
      "Crée un actif primaire « Personnel · Couche humaine Humanix Académie » dans le dossier, de type PR (primaire), marqué fonction métier, avec la référence humanix.workforce.",
    toggleName: "createWorkforceAsset",
    effect: (
      <>
        <p>
          Un Asset GRC nommé explicitement pour scoper les RiskScenarios /
          Findings / Incidents sur la couche humaine. Auparavant, les risques
          flottaient sans cible : maintenant on peut lier{" "}
          <code>RiskScenario.assets: [workforce.id]</code>.
        </p>
        <p>Champs envoyés :</p>
        <ul>
          <li>
            <code>name</code> : Personnel · Couche humaine Humanix Académie
          </li>
          <li>
            <code>type</code> : <code>PR</code> (Primary,{" "}
            <code>AssetWriteTypeEnum</code>)
          </li>
          <li>
            <code>ref_id</code> : <code>humanix.workforce</code>
          </li>
          <li>
            <code>is_business_function</code> : <code>true</code>
          </li>
          <li>
            <code>owner</code> + <code>filtering_labels</code> selon toggles
            actifs
          </li>
        </ul>
      </>
    ),
    endpoints: [
      "GET /api/assets/?folder={folderId}",
      "POST /api/assets/",
      "PATCH /api/assets/{id}/",
    ],
    useCase:
      "Le RSSI veut une cartographie des actifs où la couche humaine apparaît explicitement, pas seulement les serveurs et SaaS. Première ligne de défense visible.",
    category: "people",
  },
  {
    slug: "threats-catalog",
    title: "Catalogue de 15 menaces humaines",
    icon: "⚠",
    version: "v2.2",
    shortDescription:
      "Transmet les 15 menaces du catalogue Humanix (fraude au président, hameçonnage vocal, par SMS, par QR code, hypertrucage du dirigeant, réutilisation de mot de passe, informatique fantôme, talonnage, fuite RGPD, fuite de secrets par les développeurs, etc.) en entités de type « menace ».",
    toggleName: "syncThreats",
    effect: (
      <>
        <p>15 Threats créés dans le folder, idempotent par ref_id :</p>
        <ul className="columns-2 sm:columns-3 gap-x-6 text-sm">
          <li>HUMAN-T1 - Spear phishing finance</li>
          <li>HUMAN-T2 - Fraude au président (FOVI)</li>
          <li>HUMAN-T3 - Vishing CFO</li>
          <li>HUMAN-T4 - Smishing</li>
          <li>HUMAN-T5 - Quishing</li>
          <li>HUMAN-T6 - Deepfake CEO audio/vidéo</li>
          <li>HUMAN-T10 - Réutilisation MdP</li>
          <li>HUMAN-T11 - Identifiants visibles</li>
          <li>HUMAN-T12 - Shadow IT</li>
          <li>HUMAN-T13 - Perte / vol device</li>
          <li>HUMAN-T14 - Tailgating</li>
          <li>HUMAN-T20 - Incident non signalé</li>
          <li>HUMAN-T21 - Fuite RGPD négligence</li>
          <li>HUMAN-T30 - Fuite secrets dev</li>
          <li>HUMAN-T31 - Offboarding RH bâclé</li>
        </ul>
        <p>
          Chaque Threat est créé avec <code>provider=Humanix Académie</code>,
          description détaillée (contexte, chiffres terrain, vecteurs), et{" "}
          <code>filtering_labels</code>. Le RSSI peut ensuite les linker à ses
          RiskScenarios via le M2M <code>threats</code>.
        </p>
        <p>
          Données dérivées du{" "}
          <Link
            href="https://github.com/Humanix-Cybersecurity/Humanix-Academie/blob/main/connectors/ciso-assistant-frameworks/humanix-human-threats-catalog-v1.yaml"
            className="text-primary-500 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            catalog public CC BY-SA 4.0
          </Link>
          .
        </p>
      </>
    ),
    endpoints: [
      "GET /api/threats/?folder={folderId}&ref_id={refId}",
      "POST /api/threats/",
      "PATCH /api/threats/{id}/",
    ],
    useCase:
      "Le RSSI scope ses scénarios de risque sur les vraies menaces humaines (FOVI, deepfake) plutôt que sur des libellés génériques type MITRE ATT&CK conçus pour le tech.",
    category: "people",
  },
  // ============== AUTOMATION ==============
  {
    slug: "live-mode",
    title: "Mode temps réel - synchronisation à l'évènement",
    icon: "⚡",
    version: "v2.0",
    shortDescription:
      "Chaque évènement métier (épisode terminé, hameçonnage signalé, clic sur faux hameçonnage) déclenche une mini-synchronisation incrémentale, regroupée sur une fenêtre de 5 secondes. Le RSSI voit le score remonter en direct.",
    toggleName: "enableLiveMode",
    effect: (
      <>
        <p>
          Architecture event-driven fire-and-forget :
        </p>
        <ul>
          <li>
            Hook dans <code>/api/progress</code> →{" "}
            <code>episode.completed</code>
          </li>
          <li>
            Hook dans <code>/api/phishing/report</code> →{" "}
            <code>phishing.reported</code>
          </li>
          <li>
            Hook dans <code>/phishing/[token]</code> →{" "}
            <code>phishing.user_clicked</code>
          </li>
        </ul>
        <p>
          Debouncer in-memory par tenantId : 50 utilisateurs qui terminent un
          module en 30 secondes = <strong>1 seule sync</strong> vers CISO
          Assistant (pas 50).
        </p>
        <p>
          Re-upsert des evidences uniquement (pas de PDF, pas d'extensions -
          trop coûteux temps réel). Skip si une sync manuelle est déjà en
          cours. No-op si aucun framework n'a jamais été syncé manuellement
          (live mode rafraîchit, n'initialise pas).
        </p>
        <p>
          Télémétrie visible dans la console admin :{" "}
          <code>lastLiveSyncAt</code>, <code>lastLiveSyncEvent</code>,{" "}
          <code>liveSyncCount</code>.
        </p>
      </>
    ),
    endpoints: [
      "(réutilise les endpoints d'evidences ci-dessus)",
      "AuditAction.CISO_LIVE_SYNC",
    ],
    useCase:
      "En présentation COMEX, pendant que le DG regarde le dashboard, un collaborateur termine un module → le score remonte sous les yeux du DG. Effet « la machine est vivante ».",
    category: "automation",
  },
  {
    slug: "filtering-labels",
    title: "Étiquettes de filtrage attachées automatiquement",
    icon: "🏷",
    version: "v2.1",
    shortDescription:
      "Trois étiquettes (humanix, sensibilisation, nom du référentiel) sont créées et attachées automatiquement à toutes les entités transmises : preuves, contrôles appliqués, constats, scénarios de risque, incidents, métriques, actif, menaces, tableau de bord.",
    effect: (
      <>
        <p>
          Résolus une fois par sync via <code>ensureFilteringLabel</code>{" "}
          (normalisation regex <code>^[\w-]{`{`}1,36{`}`}$</code>),
          stockés sur <code>client.filteringLabelIds</code>, inclus
          automatiquement dans toutes les opérations d'écriture.
        </p>
        <p>
          Le RSSI peut filtrer rapidement « toutes les entités venant
          d'Humanix » dans la sidebar CISO Assistant, sans risque de
          confusion avec d'autres connecteurs ou imports manuels.
        </p>
      </>
    ),
    endpoints: [
      "GET /api/filtering-labels/?label={label}",
      "POST /api/filtering-labels/",
    ],
    useCase:
      "Permet à un RSSI multi-source (Humanix + autre outil GRC) de garder une vue claire « qu'est-ce qui vient d'où ». Filtrage natif.",
    category: "automation",
  },
  {
    slug: "campaigns",
    title: "Campagnes phishing → Campaigns",
    icon: "🎣",
    version: "v1.9",
    shortDescription:
      "Pour chaque campagne d'hameçonnage Humanix active ou récente (90 jours), crée et maintient une campagne CISO Assistant rattachée aux référentiels et au périmètre par défaut.",
    toggleName: "syncCampaigns",
    effect: (
      <>
        <p>
          Le RSSI suit toutes ses campagnes phishing simulé / smishing dans
          son cockpit GRC habituel, sans replonger dans Humanix. Status mappé
          :
        </p>
        <ul>
          <li>
            <code>scheduledAt &gt; now</code> → <code>draft</code>
          </li>
          <li>
            <code>isActive</code> ou <code>scheduledAt &le; now</code> →{" "}
            <code>in_progress</code>
          </li>
          <li>
            <code>sentAt</code> et non actif → <code>done</code>
          </li>
        </ul>
        <p>
          Comme <code>CampaignWrite.frameworks</code> et{" "}
          <code>CampaignWrite.perimeters</code> sont required côté Django, on
          crée automatiquement un Perimeter{" "}
          <em>« Humanix Académie · scope par défaut »</em> dans le folder, et
          on liste tous les Frameworks chargés. Idempotent par nom.
        </p>
      </>
    ),
    endpoints: [
      "GET /api/frameworks/",
      "GET /api/perimeters/?folder={folderId}",
      "POST /api/perimeters/",
      "GET /api/campaigns/?folder={folderId}",
      "POST /api/campaigns/",
      "PATCH /api/campaigns/{id}/",
    ],
    useCase:
      "Le RSSI évite le double pilotage : Humanix programme les campagnes phishing, mais CISO Assistant les suit en cockpit GRC central.",
    category: "automation",
  },
  // ============== AUDIT ==============
  {
    slug: "audit-log",
    title: "Audit log complet",
    icon: "📜",
    version: "v1.0",
    shortDescription:
      "Toutes les actions d'administration (configurer, tester, supprimer, synchroniser) ainsi que les évènements automatiques (synchronisation temps réel) sont auditées dans /admin/audit avec l'acteur, la cible et les métadonnées associées.",
    defaultOn: true,
    effect: (
      <>
        <p>5 actions auditées (cf. enum Prisma <code>AuditAction</code>) :</p>
        <ul>
          <li>
            <code>CISO_CONNECTION_CONFIGURED</code> - sauvegarde des creds
          </li>
          <li>
            <code>CISO_CONNECTION_TESTED</code> - bouton « Tester la
            connexion »
          </li>
          <li>
            <code>CISO_CONNECTION_DELETED</code> - suppression des creds
          </li>
          <li>
            <code>CISO_SYNC_STARTED</code> - lancement manuel d'une sync
          </li>
          <li>
            <code>CISO_LIVE_SYNC</code> - mini-sync v2.0 déclenchée par event
          </li>
        </ul>
        <p>
          Chaque entrée capture : <code>actor</code> (userId, email, role),{" "}
          <code>tenantId</code>, <code>target</code>{" "}
          (type=ciso_connection, label=baseUrl), <code>outcome</code>{" "}
          (SUCCESS/FAILURE), <code>severity</code> (INFO/WARNING),{" "}
          <code>metadata</code> (folderId, framework, ok/fail counts, durée
          ms).
        </p>
      </>
    ),
    endpoints: ["(local Humanix - table AuditLog)"],
    useCase:
      "L'auditeur ISO 27001 §9.2 demande la traçabilité « qui a touché à quoi quand ». Le bouton Sync, le test de connexion, la suppression - tout est tracé.",
    category: "audit",
  },
  {
    slug: "chiffrement",
    title: "Chiffrement AES-256-GCM",
    icon: "🔐",
    version: "v1.0",
    shortDescription:
      "Le mot de passe CISO Assistant est chiffré en AES-256-GCM avec une clé dérivée par HKDF à partir d'AUTH_SECRET. Format de stockage : iv:authTag:texte_chiffré (tout en base64).",
    defaultOn: true,
    effect: (
      <>
        <p>
          Aucun secret en clair en base de données. La clé de chiffrement
          est dérivée à la volée à partir de <code>AUTH_SECRET</code> via
          HKDF SHA-256 (HMAC-Key-Derivation-Function, RFC 5869).
        </p>
        <p>
          Avantages :
        </p>
        <ul>
          <li>
            Si la DB est dumpée, le password reste illisible (clé jamais en
            DB)
          </li>
          <li>
            Rotation simple : changer <code>AUTH_SECRET</code> = invalider
            tous les passwords stockés (à reconfigurer)
          </li>
          <li>
            Pas de dépendance KMS externe - on reste hébergeable on-prem
          </li>
        </ul>
      </>
    ),
    endpoints: ["(local Humanix - lib/ciso-assistant/encryption.ts)"],
    useCase:
      "Bonne pratique baseline pour tout connecteur sortant. Demande typique d'un audit RGPD ou ANSSI HG.",
    category: "audit",
  },
];

// Grouper par catégorie pour l'affichage
const FEATURES_BY_CATEGORY: Record<Feature["category"], Feature[]> = {
  core: [],
  grc: [],
  metrology: [],
  people: [],
  automation: [],
  audit: [],
};
FEATURES.forEach((f) => FEATURES_BY_CATEGORY[f.category].push(f));

const CATEGORY_ORDER: Feature["category"][] = [
  "core",
  "grc",
  "metrology",
  "people",
  "automation",
  "audit",
];

// ============================================================================
// Composants
// ============================================================================

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <article
      id={feature.slug}
      className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-6 shadow-sm scroll-mt-24"
    >
      <div className="flex items-start gap-4 mb-3">
        <div
          aria-hidden="true"
          className="text-3xl shrink-0 leading-none mt-0.5"
        >
          {feature.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
              {feature.title}
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
              {feature.version}
            </span>
            {feature.defaultOn && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                actif par défaut
              </span>
            )}
            {feature.toggleName && !feature.defaultOn && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                à activer
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {feature.shortDescription}
          </p>
        </div>
      </div>

      {feature.toggleName && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-mono">
          Interrupteur dans l'administration : <code>{feature.toggleName}</code>
        </p>
      )}

      <div className="prose prose-sm dark:prose-invert max-w-none mb-4 [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:bg-gray-100 [&_code]:dark:bg-slate-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
        {feature.effect}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1">
            Cas d'usage type
          </span>
          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
            {feature.useCase}
          </p>
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1">
            Endpoints CISO Assistant utilisés
          </span>
          <ul className="space-y-0.5">
            {feature.endpoints.map((e, i) => (
              <li
                key={i}
                className="text-xs font-mono text-gray-700 dark:text-gray-300"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function CisoAssistantFeaturesPage() {
  const totalFeatures = FEATURES.length;
  const toggleCount = FEATURES.filter((f) => f.toggleName).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      {/* ===== HERO ===== */}
      <header className="mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Référence connecteur · CISO Assistant
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Toutes les fonctionnalités du connecteur,{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            documentées service par service.
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl">
          Cette page documente exhaustivement chaque fonctionnalité du
          connecteur Humanix Académie × CISO Assistant : effet côté
          gouvernance, risque et conformité, services OpenAPI consommés,
          interrupteur d'activation, cas d'usage type. Chaque
          fonctionnalité est alignée contre le contrat OpenAPI réel de
          CISO Assistant community - pas d'analyse à l'envers, pas de
          devinette.
        </p>
      </header>

      {/* ===== STATS BANNER ===== */}
      <section
        aria-label="Chiffres clés du connecteur"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
      >
        <div className="rounded-xl bg-primary-500/5 dark:bg-primary-500/10 border border-primary-500/20 p-5 text-center">
          <div className="text-3xl font-extrabold text-primary-500 mb-1">
            {totalFeatures}
          </div>
          <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
            Fonctionnalités
          </div>
        </div>
        <div className="rounded-xl bg-accent-500/5 dark:bg-accent-500/10 border border-accent-500/20 p-5 text-center">
          <div className="text-3xl font-extrabold text-accent-500 mb-1">
            {toggleCount}
          </div>
          <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
            Interrupteurs indépendants
          </div>
        </div>
        <div className="rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-5 text-center">
          <div className="text-3xl font-extrabold text-emerald-600 mb-1">
            100 %
          </div>
          <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
            Idempotent
          </div>
        </div>
        <div className="rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 p-5 text-center">
          <div className="text-3xl font-extrabold text-amber-600 mb-1">
            0
          </div>
          <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
            Modification côté intuitem
          </div>
        </div>
      </section>

      {/* ===== TABLE DES MATIÈRES ===== */}
      <nav
        aria-label="Sommaire des fonctionnalités"
        className="mb-12 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-6"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-4">
          Sommaire
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
          {CATEGORY_ORDER.map((cat) => (
            <div key={cat} className="mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary-500 dark:text-accent-300 mb-1.5">
                {CATEGORIES[cat].label}
              </h3>
              <ul className="space-y-0.5">
                {FEATURES_BY_CATEGORY[cat].map((f) => (
                  <li key={f.slug}>
                    <a
                      href={`#${f.slug}`}
                      className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary-500 dark:hover:text-accent-300 transition"
                    >
                      <span aria-hidden="true">{f.icon}</span> {f.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* ===== SECTIONS PAR CATÉGORIE ===== */}
      {CATEGORY_ORDER.map((cat) => (
        <section key={cat} aria-labelledby={`cat-${cat}`} className="mb-12">
          <div className="mb-6">
            <h2
              id={`cat-${cat}`}
              className="text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-1"
            >
              {CATEGORIES[cat].label}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
              {CATEGORIES[cat].description}
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {FEATURES_BY_CATEGORY[cat].map((f) => (
              <FeatureCard key={f.slug} feature={f} />
            ))}
          </div>
        </section>
      ))}

      {/* ===== HORS PÉRIMÈTRE ===== */}
      <section
        aria-labelledby="out-of-scope"
        className="mb-12 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-6"
      >
        <h2
          id="out-of-scope"
          className="text-xl font-bold text-gray-900 dark:text-white mb-3"
        >
          Hors périmètre - explicitement
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Nous disons ce que nous couvrons, et nous disons aussi ce que nous{" "}
          <strong>ne couvrons pas</strong>. Ces fonctionnalités existent côté
          CISO Assistant mais cela n'a pas de sens de les alimenter
          automatiquement depuis Humanix :
        </p>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
          <li>
            <strong>Vulnérabilités techniques</strong> (
            <code>/api/vulnerabilities/</code>, CVE) - du ressort d'un
            scanneur de vulnérabilités du type Tenable ou Wiz.
          </li>
          <li>
            <strong>Contrats fournisseurs</strong> (
            <code>/api/contracts/</code>) - du ressort de l'achat ou du
            juridique.
          </li>
          <li>
            <strong>Questionnaires d'audit</strong> (
            <code>/api/questions/</code>, <code>/api/answers/</code>) - flux
            interne à CISO Assistant entre auditeur et audité.
          </li>
          <li>
            <strong>Acceptations de risque</strong> (
            <code>/api/risk-acceptances/</code>) - décision métier, qui doit
            rester manuelle.
          </li>
          <li>
            <strong>Membres d'équipes</strong> - nous transmettons les
            groupes Humanix comme équipes (interrupteur{" "}
            <code>syncGroupsAsTeams</code>), mais <em>pas</em> les membres
            individuels. Nécessite un utilisateur CISO Assistant pour chaque
            membre - hors périmètre.
          </li>
          <li>
            <strong>Évaluations de conformité complètes</strong> - coquille
            trop lourde à entretenir automatiquement. Le RSSI les crée à la
            main et y rattache nos preuves.
          </li>
        </ul>
      </section>

      {/* ===== APPEL À L'ACTION ===== */}
      <section className="rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white p-8 text-center">
        <h2 className="text-2xl font-extrabold mb-2">
          Activer le connecteur maintenant
        </h2>
        <p className="text-white/90 mb-5 max-w-2xl mx-auto">
          Si vous êtes administrateur, RSSI ou super-administrateur du compte
          client, vous pouvez configurer la connexion à CISO Assistant en
          deux minutes dans la console d'administration.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/admin/integrations/ciso-assistant"
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-primary-500 font-bold hover:bg-gray-50 transition"
          >
            → Configurer la connexion
          </Link>
          <Link
            href="/integrations/ciso-assistant"
            className="inline-flex items-center px-5 py-2.5 rounded-lg border-2 border-white/40 text-white font-bold hover:bg-white/10 transition"
          >
            ← Page de présentation
          </Link>
        </div>
      </section>
    </div>
  );
}
