// Page publique "Comparatif honnête".
// Le pari editorial : poser noir sur blanc nos forces ET nos faiblesses face
// aux concurrents identifies. C'est un acte commercial differencant : aucune
// suite SaaS cyber francaise ne le fait. Cible : prospects PME qui hesitent
// entre HumaniX et un acteur historique (KnowBe4, Hoxhunt, Phished) ou un
// disrupteur AI-native (Adaptive Security, Cyber Guru).
//
// REGLE EDITORIALE : on doit toujours rester honnete. Si un concurrent ajoute
// une feature qui nous depasse, on l'inscrit ici. Cette page perd sa valeur
// commerciale a la seconde ou elle ment.
//
// Refresh mai 2026 :
//  - Mantra a ete rachete par Cyber Guru (Italie) en mars 2025 → on remplace
//    la colonne Mantra par Cyber Guru et on actualise la lecture FR.
//  - Adaptive Security (US, $136M leves dont Series B 81M en 2025 par Bain
//    Capital + NVIDIA + OpenAI Fund + a16z) est devenu un disrupteur AI-native
//    avec 500+ clients en moins d'un an. C'est la vraie menace 2026, pas
//    KnowBe4 qui devient le legacy. → on ajoute une colonne dediee.
//  - Nouvelles lignes pour les sujets bouillants 2026 : vishing/voice deepfake
//    (surge +442 % H2 2024), MCP server pour agents IA (CISO Assistant l'a
//    deja, premier mover possible cote SAT/HRM), agent IA orchestrateur
//    (KnowBe4 AIDA, Hoxhunt adaptive), HRM Maturity Model (Living Security /
//    CybSafe), contenu pedagogique reellement redige (vs catalogue marketing).

import { Fragment } from "react";
import Link from "next/link";
import { countExpertEpisodes } from "@/lib/content-availability";

export const metadata = {
  title: "Comparatif honnête — HumaniX vs concurrents | Humanix Académie",
  description:
    "Comparatif honnête entre Humanix Académie et les principales plateformes de sensibilisation cyber 2026 (KnowBe4, Hoxhunt, Phished, Cyber Guru, Adaptive Security). On vous dit où nous sommes meilleurs, équivalents et moins bons.",
};

type Cell = {
  status: "win" | "equal" | "loss" | "na";
  text: string;
};

type Row = {
  category: string;
  feature: string;
  humanix: Cell;
  knowbe4: Cell;
  cyberGuru: Cell;
  hoxhunt: Cell;
  phished: Cell;
  adaptiveSecurity: Cell;
};

// Helper : evite de repeter `{ status: "loss", text: "Non" }` partout.
const win = (text: string): Cell => ({ status: "win", text });
const eq = (text: string): Cell => ({ status: "equal", text });
const loss = (text: string): Cell => ({ status: "loss", text });

const ROWS: Row[] = [
  // -----------------------------------------------------------------------
  // CATÉGORIE : TARIFICATION
  // -----------------------------------------------------------------------
  {
    category: "Tarification",
    feature: "Prix d'entrée pour 10 personnes",
    humanix: win("0 € self-host AGPL ou 19 €/mois cloud Starter"),
    knowbe4: loss("~3 500 €/an minimum"),
    cyberGuru: loss("~2 400 €/an minimum (ex-Mantra)"),
    hoxhunt: loss("Sur devis (>3 000 €/an)"),
    phished: loss("~1 800 €/an minimum"),
    adaptiveSecurity: loss("Sur devis enterprise (>5 000 €/an attendu)"),
  },
  {
    category: "Tarification",
    feature: "Code source ouvert (auditabilité)",
    humanix: win("AGPLv3 — code complet public sur GitHub"),
    knowbe4: loss("Boîte noire (US)"),
    cyberGuru: loss("Boîte noire (Italie)"),
    hoxhunt: loss("Boîte noire (FI/US)"),
    phished: loss("Boîte noire (BE)"),
    adaptiveSecurity: loss("Boîte noire (US, fondée 2023)"),
  },
  {
    category: "Tarification",
    feature: "Tarif transparent affiché publiquement",
    humanix: win("Oui, grille complète"),
    knowbe4: loss("Sur devis"),
    cyberGuru: loss("Sur devis"),
    hoxhunt: loss("Sur devis"),
    phished: eq("Partiellement"),
    adaptiveSecurity: loss("Sur devis"),
  },
  {
    category: "Tarification",
    feature: "Engagement minimum",
    humanix: win("Sans engagement"),
    knowbe4: loss("12 mois minimum"),
    cyberGuru: eq("12 mois recommandé"),
    hoxhunt: loss("12 mois minimum"),
    phished: eq("12 mois recommandé"),
    adaptiveSecurity: loss("12 mois minimum"),
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : CATALOGUE & CONTENU
  // -----------------------------------------------------------------------
  {
    category: "Catalogue & contenu",
    feature: "Nombre de modules disponibles (catalogue)",
    humanix: eq("180 modules (25 saisons + marketplace)"),
    knowbe4: win("1 000+ modules"),
    cyberGuru: eq("300+ modules"),
    hoxhunt: eq("~100 modules"),
    phished: win("500+ modules"),
    adaptiveSecurity: eq("Modules génératifs IA à la demande"),
  },
  {
    category: "Catalogue & contenu",
    feature: "Modules en français natifs (non traduits)",
    humanix: win("100 % FR natif"),
    knowbe4: loss("Traduits depuis l'anglais"),
    cyberGuru: win("FR + IT natif"),
    hoxhunt: loss("Traduction partielle"),
    phished: eq("Mix FR / traduit"),
    adaptiveSecurity: loss("EN d'abord, FR par génération IA"),
  },
  {
    category: "Catalogue & contenu",
    feature: "Marketplace ouverte (modules communauté)",
    humanix: win("Oui, modulable + auteur visible"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Catalogue & contenu",
    feature: "Modules pour la sphère personnelle / famille",
    humanix: win("Oui, /famille gratuit + invitations proches"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : SIMULATION PHISHING & SOCIAL ENGINEERING
  // -----------------------------------------------------------------------
  {
    category: "Simulation phishing & ingénierie sociale",
    feature: "Campagnes phishing simulé (email)",
    humanix: eq("Oui, templates FR"),
    knowbe4: win("Référence du marché + AIDA Orchestration"),
    cyberGuru: eq("Oui, IA-personnalisé"),
    hoxhunt: win("IA + adaptive learning multi-canal"),
    phished: eq("Oui, automatisation"),
    adaptiveSecurity: win("AI-native génératif end-to-end"),
  },
  {
    category: "Simulation phishing & ingénierie sociale",
    feature: "Plugin Outlook / Gmail (bouton « Signaler »)",
    humanix: eq("Add-in Outlook livré (Gmail à venir)"),
    knowbe4: win("Oui, mature + Gmail"),
    cyberGuru: win("Oui + Gmail"),
    hoxhunt: win("Oui, intégré + Gmail"),
    phished: win("Oui + Gmail"),
    adaptiveSecurity: win("Oui (créé pour AI-era)"),
  },
  {
    category: "Simulation phishing & ingénierie sociale",
    feature: "IA générative pour personnaliser les phishings",
    humanix: win("Oui — Mistral souverain FR (RGPD natif)"),
    knowbe4: eq("Oui (USA, Cloud Act)"),
    cyberGuru: eq("Oui (Italie/UE)"),
    hoxhunt: eq("Oui (FI)"),
    phished: eq("Oui (BE)"),
    adaptiveSecurity: eq("Oui (OpenAI, USA, Cloud Act)"),
  },
  {
    category: "Simulation phishing & ingénierie sociale",
    feature: "Vishing / simulation voix (deepfake +442 % H2 2024)",
    humanix: loss("Roadmap mai 2026 — Mistral + Piper TTS souverain FR"),
    knowbe4: eq("AIDA voice agent (cloud US)"),
    cyberGuru: loss("Non documenté"),
    hoxhunt: win("Voice overlays mature"),
    phished: loss("Non"),
    adaptiveSecurity: win("Spécialiste voice deepfake (POC en démo)"),
  },
  {
    category: "Simulation phishing & ingénierie sociale",
    feature: "Smishing / simulation SMS",
    humanix: loss("Non (roadmap Q3 2026)"),
    knowbe4: win("Oui"),
    cyberGuru: eq("Oui"),
    hoxhunt: win("Oui"),
    phished: eq("Oui"),
    adaptiveSecurity: win("Oui (multi-canal natif)"),
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : CONFORMITÉ & SOUVERAINETÉ
  // -----------------------------------------------------------------------
  {
    category: "Conformité & souveraineté",
    feature: "Hébergement 100 % France",
    humanix: win("Oui, Scaleway Paris"),
    knowbe4: loss("USA + UE multi-régions"),
    cyberGuru: eq("UE (Italie + FR optionnel)"),
    hoxhunt: loss("Finlande / UE"),
    phished: eq("Belgique / UE"),
    adaptiveSecurity: loss("USA (AWS multi-région)"),
  },
  {
    category: "Conformité & souveraineté",
    feature: "DPA + Registre RGPD pré-remplis",
    humanix: win("Oui, fournis dès trial"),
    knowbe4: eq("Sur demande"),
    cyberGuru: eq("Sur demande"),
    hoxhunt: loss("DPA seul"),
    phished: eq("Sur demande"),
    adaptiveSecurity: eq("Sur demande"),
  },
  {
    category: "Conformité & souveraineté",
    feature: "Pack NIS2 prêt à signer (par-tenant)",
    humanix: win("Oui, livré 2026"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Conformité & souveraineté",
    feature: "Accessibilité RGAA / WCAG 2.1 AA",
    humanix: win("Conformité interne 88 %, audit cabinet à venir"),
    knowbe4: eq("WCAG partiel"),
    cyberGuru: eq("WCAG partiel"),
    hoxhunt: eq("WCAG partiel"),
    phished: loss("Non documenté"),
    adaptiveSecurity: loss("Non documenté"),
  },
  {
    category: "Conformité & souveraineté",
    feature: "Rapport d'audit de sécurité public",
    humanix: win("Oui, PDF public + Markdown versionné Git"),
    knowbe4: eq("SOC 2 Type II (sur demande NDA)"),
    cyberGuru: loss("Non"),
    hoxhunt: eq("ISO 27001 (sur demande NDA)"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non documenté (jeune éditeur)"),
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : PILOTAGE DIRIGEANT
  // -----------------------------------------------------------------------
  {
    category: "Pilotage dirigeant",
    feature: "Dashboard CODIR (mode présentation)",
    humanix: win("Oui, plein écran COMEX"),
    knowbe4: eq("Dashboard exec partiel"),
    cyberGuru: eq("Dashboard exec"),
    hoxhunt: win("Dashboard exec mature"),
    phished: eq("Dashboard exec partiel"),
    adaptiveSecurity: eq("Dashboard exec moderne"),
  },
  {
    category: "Pilotage dirigeant",
    feature: "Live Attack Map temps réel (SSE)",
    humanix: win("Oui, dashboard live"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Pilotage dirigeant",
    feature: "Cyber-météo France (alerte cyber nationale CERT-FR)",
    humanix: win("Oui, intégré (souverain)"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Pilotage dirigeant",
    feature: "Posters PDF mensuels personnalisés (open-space)",
    humanix: win("Oui, 12 thèmes/an, A3 imprimable"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Pilotage dirigeant",
    feature: "Observatoire des fuites de données françaises",
    humanix: win("Oui, 3 sources agrégées (FR)"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Pilotage dirigeant",
    feature: "Calcul ROI cyber en €",
    humanix: win("Oui, cf. Impact Business"),
    knowbe4: eq("Add-on payant"),
    cyberGuru: loss("Non"),
    hoxhunt: eq("Add-on payant"),
    phished: loss("Non"),
    adaptiveSecurity: eq("Risk scoring € (Series B)"),
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : HRM (HUMAN RISK MANAGEMENT — TENDANCE 2026)
  // -----------------------------------------------------------------------
  {
    category: "Human Risk Management 2026",
    feature: "Score de risque humain par utilisateur",
    humanix: win("Oui — User.riskScore Prisma"),
    knowbe4: win("Risk score par user (mature)"),
    cyberGuru: eq("Score basique"),
    hoxhunt: win("Behavioral risk score (référence)"),
    phished: win("Behavioral Risk Score™"),
    adaptiveSecurity: win("AI risk scoring continu"),
  },
  {
    category: "Human Risk Management 2026",
    feature: "Agent IA orchestrateur autonome (auto-pilote awareness)",
    humanix: loss("Non (roadmap Q3 2026)"),
    knowbe4: win("AIDA Orchestration (8 agents IA, 2026)"),
    cyberGuru: loss("Non"),
    hoxhunt: win("Adaptive AI continu"),
    phished: eq("Auto-cadence + auto-content"),
    adaptiveSecurity: win("AI-native autonome (POC)"),
  },
  {
    category: "Human Risk Management 2026",
    feature: "MCP Server pour agents IA (Claude / Mistral / GPT)",
    humanix: win("MVP livré — connectors/mcp-server, premier mover SAT/HRM 🇫🇷"),
    knowbe4: loss("Non documenté"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non documenté"),
  },
  {
    category: "Human Risk Management 2026",
    feature: "Couvre risque agents IA (non-humain)",
    humanix: loss("Non (2027 — sujet émergent)"),
    knowbe4: win("Annoncé 2026 (RSAC)"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: eq("Annoncé deepfake agents"),
  },
  {
    category: "Human Risk Management 2026",
    feature: "Sandbox courrier suspect (repeat offender protection)",
    humanix: loss("Non"),
    knowbe4: eq("Add-on PhishER"),
    cyberGuru: loss("Non"),
    hoxhunt: eq("Threat triage"),
    phished: win("Zero Incident Mail™ (référence)"),
    adaptiveSecurity: loss("Non"),
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : INTÉGRATIONS
  // -----------------------------------------------------------------------
  {
    category: "Intégrations",
    feature: "Webhooks Slack / Teams natifs",
    humanix: win("Oui, sans setup IT"),
    knowbe4: win("Oui (PRO)"),
    cyberGuru: win("Oui"),
    hoxhunt: win("Oui"),
    phished: eq("Email seulement"),
    adaptiveSecurity: win("Oui"),
  },
  {
    category: "Intégrations",
    feature: "SSO Google / Microsoft (1-clic)",
    humanix: win("Oui (natif Auth.js v5)"),
    knowbe4: eq("Oui (Enterprise)"),
    cyberGuru: eq("Oui"),
    hoxhunt: eq("Oui"),
    phished: eq("Oui"),
    adaptiveSecurity: eq("Oui"),
  },
  {
    category: "Intégrations",
    feature: "SAML 2.0 / SCIM provisioning",
    humanix: eq("Sur demande contrats > 50 users"),
    knowbe4: win("Oui (Enterprise)"),
    cyberGuru: win("Oui"),
    hoxhunt: win("Oui"),
    phished: win("Oui"),
    adaptiveSecurity: win("Oui (Enterprise)"),
  },
  {
    category: "Intégrations",
    feature: "Connecteur GRC natif (CISO Assistant)",
    humanix: win("Oui — endpoint /api/v1/evidence-export + connecteur Python"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Intégrations",
    feature: "Format OSCAL v1.1.2 (NIST) — preuves portables",
    humanix: win("Oui — format=oscal-v1, compatible Eramba/RegScale"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Intégrations",
    feature: "SCIM v2 auto-provisioning (Entra/Okta/Google)",
    humanix: win("Oui — RFC 7643/7644, extension custom Humanix"),
    knowbe4: eq("Oui (Enterprise)"),
    cyberGuru: loss("Non"),
    hoxhunt: eq("Oui"),
    phished: loss("Non"),
    adaptiveSecurity: eq("Oui"),
  },
  {
    category: "Intégrations",
    feature: "Webhooks signés HMAC + doc publique",
    humanix: win("Oui — HMAC-SHA256, SSRF-safe, doc Stripe-like"),
    knowbe4: eq("Oui (basique)"),
    cyberGuru: eq("Oui"),
    hoxhunt: eq("Oui"),
    phished: loss("Email seulement"),
    adaptiveSecurity: eq("Oui"),
  },
  {
    category: "Intégrations",
    feature: "Connecteur Microsoft Sentinel + workbook clé en main",
    humanix: win("Oui — Logs Ingestion API + workbook JSON fourni"),
    knowbe4: eq("Doc partielle, pas de workbook"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non documenté"),
  },
  {
    category: "Intégrations",
    feature: "Connecteur Splunk HEC + SPL queries fournies",
    humanix: win("Oui — format CIM v1 + connecteur Python MIT"),
    knowbe4: eq("Format propriétaire"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non documenté"),
  },
  {
    category: "Intégrations",
    feature: "Connecteurs souverains 🇫🇷 (Sekoia, HarfangLab, Mailinblack/Vade)",
    humanix: win("Oui — 3 connecteurs FR natifs MIT"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Intégrations",
    feature: "Connecteur HR souverain (Lucca → SCIM)",
    humanix: win("Oui — connecteur Python MIT"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Intégrations",
    feature: "Plugin GLPI (ITSM le plus déployé en PME FR)",
    humanix: win("Oui — bridge Python avec tickets auto"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Intégrations",
    feature: "Liaison CyberMalveillance.gouv.fr",
    humanix: win("Oui — référencement officiel + ressources intégrées"),
    knowbe4: loss("Non (acteur US)"),
    cyberGuru: loss("Non (acteur IT)"),
    hoxhunt: loss("Non (acteur FI)"),
    phished: loss("Non (acteur BE)"),
    adaptiveSecurity: loss("Non (acteur US)"),
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : ÉCOSYSTÈME
  // -----------------------------------------------------------------------
  {
    category: "Écosystème",
    feature: "Certification Qualiopi (financement OPCO)",
    humanix: eq("Sur demande contrats > 50 users"),
    knowbe4: loss("Non"),
    cyberGuru: eq("Partenaire OF (ex-Mantra)"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Écosystème",
    feature: "Partenariats assureurs cyber",
    humanix: loss("En négociation 2026"),
    knowbe4: win("Oui (USA / UE)"),
    cyberGuru: loss("Non"),
    hoxhunt: eq("Quelques accords"),
    phished: loss("Non"),
    adaptiveSecurity: eq("Capital One Ventures + Citi (signal fort)"),
  },
  {
    category: "Écosystème",
    feature: "Levée de fonds / soutien stratégique",
    humanix: eq("Bootstrap solo, pivot OSS mai 2026"),
    knowbe4: win("Vista Equity Partners (US)"),
    cyberGuru: eq("Tour B 2024"),
    hoxhunt: win("Series C ($40M+)"),
    phished: eq("Series A"),
    adaptiveSecurity: win("$136M (a16z, OpenAI, Bain, NVIDIA)"),
  },
];

const COMPETITORS: Array<{ key: keyof Omit<Row, "category" | "feature" | "humanix">; name: string; site: string }> = [
  { key: "knowbe4", name: "KnowBe4", site: "https://www.knowbe4.com" },
  { key: "cyberGuru", name: "Cyber Guru", site: "https://www.cyberguru.it" },
  { key: "hoxhunt", name: "Hoxhunt", site: "https://hoxhunt.com" },
  { key: "phished", name: "Phished", site: "https://phished.io" },
  {
    key: "adaptiveSecurity",
    name: "Adaptive Security",
    site: "https://www.adaptivesecurity.com",
  },
];

const CATEGORIES = Array.from(new Set(ROWS.map((r) => r.category)));

const STATUS_STYLE = {
  win: "bg-green-50 text-green-800 border-green-200",
  equal: "bg-amber-50 text-amber-800 border-amber-200",
  loss: "bg-red-50 text-red-800 border-red-200",
  na: "bg-gray-50 text-gray-500 border-gray-200",
} as const;

const STATUS_ICON = {
  win: "✓",
  equal: "≈",
  loss: "−",
  na: "·",
} as const;

const STATUS_LABEL = {
  win: "Avantage HumaniX",
  equal: "Équivalent",
  loss: "Avantage concurrent",
  na: "Non applicable",
} as const;

function StatusCell({
  cell,
  isHumanix = false,
}: {
  cell: Cell;
  isHumanix?: boolean;
}) {
  return (
    <td
      className={`p-3 border ${STATUS_STYLE[cell.status]} text-xs sm:text-sm align-top ${
        isHumanix ? "font-bold" : ""
      }`}
    >
      <div className="flex items-start gap-1.5">
        <span aria-hidden="true" className="font-bold">
          {STATUS_ICON[cell.status]}
        </span>
        <span>
          <span className="sr-only">{STATUS_LABEL[cell.status]} :</span>
          {cell.text}
        </span>
      </div>
    </td>
  );
}

export default function ComparatifPage() {
  // Stats globales pour le hero
  const totalRows = ROWS.length;
  const winsHumanix = ROWS.filter((r) => r.humanix.status === "win").length;
  const lossesHumanix = ROWS.filter((r) => r.humanix.status === "loss").length;
  const equalHumanix = totalRows - winsHumanix - lossesHumanix;

  // Stat dynamique : nombre de modules MDX rediges (transparence sur le
  // contenu pedagogique reel, vs catalogue marketing).
  const expertCount = countExpertEpisodes();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
      {/* Hero */}
      <div className="text-center mb-10 max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-2">
          Transparence radicale
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Comparatif <span className="text-accent-500">honnête</span>.
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
          On vous dit franchement ce qu'on fait mieux que nos concurrents, ce
          qu'on fait équivalent, et ce qu'on ne sait pas (encore) faire aussi
          bien qu'eux. Avec liens vers leurs sites pour que vous vérifiiez.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="card bg-green-50 border-green-200">
            <p className="text-3xl font-extrabold text-green-700">
              {winsHumanix}
            </p>
            <p className="text-green-800 font-medium">avantages HumaniX</p>
          </div>
          <div className="card bg-amber-50 border-amber-200">
            <p className="text-3xl font-extrabold text-amber-700">
              {equalHumanix}
            </p>
            <p className="text-amber-800 font-medium">équivalences</p>
          </div>
          <div className="card bg-red-50 border-red-200">
            <p className="text-3xl font-extrabold text-red-700">
              {lossesHumanix}
            </p>
            <p className="text-red-800 font-medium">où ils sont meilleurs</p>
          </div>
        </div>
      </div>

      {/* Engagement éditorial */}
      <div className="card mb-8 bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500">
        <h2 className="font-bold text-primary-500 mb-2">
          Notre engagement éditorial
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          Cette page est mise à jour{" "}
          <strong>à chaque sortie produit majeure</strong> (la nôtre comme celle
          des concurrents). <strong>Refresh mai 2026 :</strong> Mantra a été
          racheté par Cyber Guru (Italie) en mars 2025 — la colonne Mantra est
          remplacée par Cyber Guru. On a aussi ajouté <strong>Adaptive Security</strong>{" "}
          (US, $136M levés dont $81M Series B fin 2025 par Bain Capital,
          NVIDIA, OpenAI Fund et a16z), qui est devenu le disrupteur AI-native du
          marché. Si vous constatez une information inexacte, écrivez à{" "}
          <a
            href="mailto:contact@humanix-cybersecurity.fr"
            className="text-accent-500 underline font-medium"
          >
            contact@humanix-cybersecurity.fr
          </a>{" "}
          : on corrige sous 7 jours et on cite votre signalement. Aucun
          concurrent n'a été contacté pour valider cette page : c'est notre
          lecture honnête, basée sur leurs sites publics et nos retours clients.
        </p>
      </div>

      {/* Note contenu pédagogique */}
      <div className="card mb-8 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400">
        <h2 className="font-bold text-amber-700 mb-2">
          Note transparence : modules pédagogiques
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          Notre catalogue affiche 180 modules. À ce jour, <strong>{expertCount} épisode
          {expertCount > 1 ? "s ont" : " a"} un scénario détaillé rédigé par un
          expert</strong> (visibles avec le badge 📝 sur{" "}
          <Link href="/apprendre" className="text-accent-500 underline">
            /apprendre
          </Link>
          ). Les autres utilisent un fallback structuré (questions, quiz, debrief
          générique). C'est la même mécanique que chez la plupart des concurrents
          listés, mais la plupart ne le disent pas. Notre cible Q3 2026 : 30
          modules expert sur les saisons critiques (phishing, mots de passe,
          NIS2, RGPD).
        </p>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto -mx-4 px-4 mb-10">
        <table
          className="w-full border-collapse min-w-[1100px]"
          aria-label="Comparatif Humanix Académie versus concurrents"
        >
          <thead>
            <tr>
              <th className="bg-gray-50 dark:bg-slate-800 p-3 border text-left text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300 sticky left-0 z-10">
                Critère
              </th>
              <th className="bg-primary-500 text-white p-3 border text-sm">
                Humanix Académie
              </th>
              {COMPETITORS.map((c) => (
                <th
                  key={c.key}
                  className="bg-gray-50 dark:bg-slate-800 p-3 border text-sm"
                >
                  <a
                    href={c.site}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent-500 underline-offset-2 hover:underline"
                  >
                    {c.name}
                    <span aria-hidden="true" className="text-xs ml-1">
                      ↗
                    </span>
                    <span className="sr-only">
                      {" "}
                      (s'ouvre dans un nouvel onglet)
                    </span>
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => (
              <Fragment key={cat}>
                <tr>
                  <td
                    colSpan={2 + COMPETITORS.length}
                    className="bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-bold text-xs uppercase tracking-wide p-2 border"
                  >
                    {cat}
                  </td>
                </tr>
                {ROWS.filter((r) => r.category === cat).map((row, idx) => (
                  <tr key={`${cat}-${idx}`}>
                    <th
                      scope="row"
                      className="bg-white dark:bg-slate-900 p-3 border text-left text-sm font-medium text-gray-800 dark:text-gray-200 sticky left-0 z-10"
                    >
                      {row.feature}
                    </th>
                    <StatusCell cell={row.humanix} isHumanix />
                    {COMPETITORS.map((c) => (
                      <StatusCell key={c.key} cell={row[c.key]} />
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Légende */}
      <div className="grid sm:grid-cols-4 gap-3 text-xs mb-12">
        <div className={`p-3 rounded border ${STATUS_STYLE.win}`}>
          <span className="font-bold">✓ Avantage HumaniX</span>
          <p className="mt-1">On fait mieux que les concurrents listés.</p>
        </div>
        <div className={`p-3 rounded border ${STATUS_STYLE.equal}`}>
          <span className="font-bold">≈ Équivalent</span>
          <p className="mt-1">
            Performance comparable, choix sur d'autres critères.
          </p>
        </div>
        <div className={`p-3 rounded border ${STATUS_STYLE.loss}`}>
          <span className="font-bold">− Avantage concurrent</span>
          <p className="mt-1">On reconnait : ils font mieux sur ce point.</p>
        </div>
        <div className={`p-3 rounded border ${STATUS_STYLE.na}`}>
          <span className="font-bold">· Non applicable</span>
          <p className="mt-1">Critère non pertinent ou non documenté.</p>
        </div>
      </div>

      {/* Notre lecture */}
      <div className="card mb-10">
        <h2 className="text-2xl font-bold text-primary-500 mb-4">
          Notre lecture stratégique (mai 2026)
        </h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            <strong className="text-primary-500">
              Là où nous gagnons structurellement
            </strong>{" "}
            (souveraineté FR end-to-end, AGPLv3 auditable, écosystème connecteurs
            FR/UE, marketplace ouverte, accessibilité, programme famille, pack
            NIS2 par-tenant, MCP server premier mover) : ces choix sont
            structurels, difficiles à copier rapidement par des acteurs
            internationaux focalisés sur le mid-market US.
          </p>
          <p>
            <strong className="text-primary-500">
              Là où ils gagnent (acteurs historiques)
            </strong>{" "}
            (volume catalogue, plugin Outlook mature, agent IA orchestrateur,
            simulation smishing/voice native, SAML/SCIM enterprise) : ces écarts
            sont réels mais ne sont pas bloquants pour une PME de moins de
            250 personnes. Nous comblons progressivement (vishing souverain en
            développement pour mai 2026, audit RGAA cabinet à venir, Qualiopi
            en cours).
          </p>
          <p>
            <strong className="text-primary-500">
              Le vrai disrupteur 2026 — Adaptive Security
            </strong>{" "}
            (US, $136M levés en moins de 2 ans, premier investissement cyber
            d'OpenAI) ne joue pas dans la même catégorie tarifaire ni
            réglementaire. Pour une organisation française soumise à NIS2 ou
            DORA, le Cloud Act sur leur stack OpenAI/AWS US reste un signal
            rouge. Nous offrons une alternative AI-native souveraine : Mistral
            (Paris) + Piper TTS (local) + Scaleway (Paris) — la <em>seule</em>{" "}
            stack 100 % FR/UE pour les attaques voice deepfake.
          </p>
          <p>
            <strong className="text-primary-500">Notre conviction</strong> :
            pour une PME française qui démarre une démarche cyber, payer 5 à 10
            fois moins cher pour 80 % des fonctionnalités utiles — et bénéficier
            d'un accompagnement humain plutôt que d'un support tier-3 anglophone
            — est le bon arbitrage. Pour une ETI multi-pays avec besoins
            SSO/SCIM lourds, les acteurs historiques restent plus adaptés.
            Pour une organisation soumise à NIS2/DORA qui veut garder ses
            preuves dans l'UE, nous sommes seuls sur ce créneau combiné cyber +
            humain + souverain.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="card bg-gradient-to-br from-primary-500 to-accent-500 text-white text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
          Pas convaincu·e par notre version ?
        </h2>
        <p className="opacity-90 mb-6 max-w-xl mx-auto">
          Faites votre propre comparaison. Démarrez 14 jours gratuits, sans
          carte bancaire, et confrontez Humanix Académie à vos critères réels.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/connexion"
            className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
          >
            Démarrer mes 14 jours gratuits
          </Link>
          <Link
            href="/audit-flash"
            className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition"
          >
            Faire l'audit flash gratuit (5 min)
          </Link>
        </div>
      </div>
    </div>
  );
}
