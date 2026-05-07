// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique "Comparatif honnete" - refonte cosy mai 2026.
//
// Le pari editorial reste : poser noir sur blanc nos forces ET nos faiblesses
// face aux concurrents. Aucune suite SaaS cyber francaise ne le fait.
//
// REGLE EDITORIALE : on doit toujours rester honnete. Si un concurrent ajoute
// une feature qui nous depasse, on l'inscrit ici. Cette page perd sa valeur
// commerciale a la seconde ou elle ment.
//
// Refonte mai 2026 (cosy / charmant / impactant) :
//  - Hero invitation au voyage avec HexBackdrop (vs hero sec et chiffre)
//  - Chapitres narratifs entre les categories (pourquoi cette categorie compte)
//  - Palette cyclee par categorie (les 6 saisons : cyan/emerald/amber/purple/rose/indigo)
//  - Vocabulaire transforme : "où ils sont meilleurs" → "ce qu'on apprend d'eux"
//  - CTA final cosy : "habitude tranquille" pas "14 jours gratuits"
//  - Citation finale signee "Hex veille"
//  - Animation slide-up en cascade (idx * 60ms)
//
// Refresh mai 2026 (donnees) :
//  - Mantra rachete par Cyber Guru (Italie) en mars 2025 → colonne Cyber Guru
//  - Adaptive Security (US, $136M leves) ajoutee comme disrupteur AI-native
//  - Lignes vishing (deepfake +442 % H2 2024), MCP server, agents IA
//    orchestrateurs, HRM Maturity Model, contenu pedagogique reel.

import { Fragment } from "react";
import Link from "next/link";
import { countExpertEpisodes } from "@/lib/content-availability";
import HexBackdrop from "@/components/HexBackdrop";

const META_TITLE = "Comparatif honnête - HumaniX vs concurrents | Humanix Académie";
const META_DESCRIPTION =
  "Comparatif honnête entre Humanix Académie et les principales plateformes de sensibilisation cyber 2026 (KnowBe4, Hoxhunt, Phished, Cyber Guru, Adaptive Security). On vous dit où nous sommes meilleurs, équivalents et ce qu'on apprend d'eux.";

export const metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    type: "website",
    images: [{ url: "/logo-humanix-academie-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: ["/logo-humanix-academie-512.png"],
  },
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
    humanix: win("AGPLv3 - code complet public sur GitHub"),
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
    humanix: win("Oui - Mistral souverain FR (RGPD natif)"),
    knowbe4: eq("Oui (USA, Cloud Act)"),
    cyberGuru: eq("Oui (Italie/UE)"),
    hoxhunt: eq("Oui (FI)"),
    phished: eq("Oui (BE)"),
    adaptiveSecurity: eq("Oui (OpenAI, USA, Cloud Act)"),
  },
  {
    category: "Simulation phishing & ingénierie sociale",
    feature: "Vishing / simulation voix (deepfake +442 % H2 2024)",
    humanix: eq("MVP livré - Mistral + Piper TTS 100 % souverain FR"),
    knowbe4: eq("AIDA voice agent (cloud US)"),
    cyberGuru: loss("Non documenté"),
    hoxhunt: win("Voice overlays mature"),
    phished: loss("Non"),
    adaptiveSecurity: win("Spécialiste voice deepfake (POC en démo)"),
  },
  {
    category: "Simulation phishing & ingénierie sociale",
    feature: "Smishing / simulation SMS",
    humanix: eq("MVP livré - Mistral 100 % souverain FR (génération SMS)"),
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
  // CATÉGORIE : HRM (HUMAN RISK MANAGEMENT - TENDANCE 2026)
  // -----------------------------------------------------------------------
  {
    category: "Human Risk Management 2026",
    feature: "Score de risque humain par utilisateur",
    humanix: win("Oui - User.riskScore Prisma"),
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
    humanix: win("MVP livré - connectors/mcp-server, premier mover SAT/HRM 🇫🇷"),
    knowbe4: loss("Non documenté"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non documenté"),
  },
  {
    category: "Human Risk Management 2026",
    feature: "Couvre risque agents IA (non-humain)",
    humanix: loss("Non (2027 - sujet émergent)"),
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
    humanix: win("Oui - endpoint /api/v1/evidence-export + connecteur Python"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Intégrations",
    feature: "Format OSCAL v1.1.2 (NIST) - preuves portables",
    humanix: win("Oui - format=oscal-v1, compatible Eramba/RegScale"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Intégrations",
    feature: "SCIM v2 auto-provisioning (Entra/Okta/Google)",
    humanix: win("Oui - RFC 7643/7644, extension custom Humanix"),
    knowbe4: eq("Oui (Enterprise)"),
    cyberGuru: loss("Non"),
    hoxhunt: eq("Oui"),
    phished: loss("Non"),
    adaptiveSecurity: eq("Oui"),
  },
  {
    category: "Intégrations",
    feature: "Webhooks signés HMAC + doc publique",
    humanix: win("Oui - HMAC-SHA256, SSRF-safe, doc Stripe-like"),
    knowbe4: eq("Oui (basique)"),
    cyberGuru: eq("Oui"),
    hoxhunt: eq("Oui"),
    phished: loss("Email seulement"),
    adaptiveSecurity: eq("Oui"),
  },
  {
    category: "Intégrations",
    feature: "Connecteur Microsoft Sentinel + workbook clé en main",
    humanix: win("Oui - Logs Ingestion API + workbook JSON fourni"),
    knowbe4: eq("Doc partielle, pas de workbook"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non documenté"),
  },
  {
    category: "Intégrations",
    feature: "Connecteur Splunk HEC + SPL queries fournies",
    humanix: win("Oui - format CIM v1 + connecteur Python MIT"),
    knowbe4: eq("Format propriétaire"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non documenté"),
  },
  {
    category: "Intégrations",
    feature: "Connecteurs souverains 🇫🇷 (Sekoia, HarfangLab, Mailinblack/Vade)",
    humanix: win("Oui - 3 connecteurs FR natifs MIT"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Intégrations",
    feature: "Connecteur HR souverain (Lucca → SCIM)",
    humanix: win("Oui - connecteur Python MIT"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Intégrations",
    feature: "Plugin GLPI (ITSM le plus déployé en PME FR)",
    humanix: win("Oui - bridge Python avec tickets auto"),
    knowbe4: loss("Non"),
    cyberGuru: loss("Non"),
    hoxhunt: loss("Non"),
    phished: loss("Non"),
    adaptiveSecurity: loss("Non"),
  },
  {
    category: "Intégrations",
    feature: "Liaison CyberMalveillance.gouv.fr",
    humanix: win("Oui - référencement officiel + ressources intégrées"),
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

// Palette par categorie : on cycle les 6 saisons (cosy series mai 2026)
// pour donner une identite douce a chaque chapitre du voyage.
type CategoryMeta = {
  emoji: string;
  intro: string;
  palette: {
    bg: string;
    ring: string;
    badge: string;
    accent: string;
  };
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  Tarification: {
    emoji: "💶",
    intro:
      "Le portefeuille avant tout. La cyber doit etre accessible, pas reservee aux ETI qui peuvent payer 5 chiffres par an. Voici comment on s'aligne - et ou nos prix racontent une autre histoire.",
    palette: {
      bg: "from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40",
      ring: "border-cyan-200 dark:border-cyan-900/40",
      badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
      accent: "text-cyan-700 dark:text-cyan-300",
    },
  },
  "Catalogue & contenu": {
    emoji: "📚",
    intro:
      "Le contenu, c'est le coeur du metier. Beaucoup de modules ne fait pas tout : un module bien ecrit, en francais, qui s'adresse vraiment a l'apprenant, vaut dix modules traduits a la chaine.",
    palette: {
      bg: "from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40",
      ring: "border-emerald-200 dark:border-emerald-900/40",
      badge:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
      accent: "text-emerald-700 dark:text-emerald-300",
    },
  },
  "Simulation phishing & ingénierie sociale": {
    emoji: "🎣",
    intro:
      "Le terrain de jeu prefere des attaquants. On simule pour entrainer, jamais pour piéger. La nuance se voit dans les details : le ton du debrief, la qualite des templates, la souverainete de l'IA derriere.",
    palette: {
      bg: "from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40",
      ring: "border-amber-200 dark:border-amber-900/40",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
      accent: "text-amber-700 dark:text-amber-300",
    },
  },
  "Conformité & souveraineté": {
    emoji: "🛡",
    intro:
      "NIS2, RGPD, DORA, Cloud Act - la conformite n'est pas un argument marketing, c'est un filet de securite pour le dirigeant. On joue cartes sur table sur ou s'arrete notre maturite et ou on excelle.",
    palette: {
      bg: "from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/40",
      ring: "border-purple-200 dark:border-purple-900/40",
      badge:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
      accent: "text-purple-700 dark:text-purple-300",
    },
  },
  "Pilotage dirigeant": {
    emoji: "📊",
    intro:
      "Un dirigeant n'a pas le temps de devenir analyste cyber. Il a besoin d'une photo claire de la maturité humaine de son organisation, et d'arguments concrets pour son COMEX. C'est notre obsession.",
    palette: {
      bg: "from-rose-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40",
      ring: "border-rose-200 dark:border-rose-900/40",
      badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
      accent: "text-rose-700 dark:text-rose-300",
    },
  },
  "Human Risk Management 2026": {
    emoji: "🧭",
    intro:
      "Le marche bascule du Security Awareness Training (SAT) vers le Human Risk Management (HRM). Les concurrents sortent leurs agents IA - on a fait le choix d'un MCP server ouvert, premier mover en France.",
    palette: {
      bg: "from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40",
      ring: "border-indigo-200 dark:border-indigo-900/40",
      badge:
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
      accent: "text-indigo-700 dark:text-indigo-300",
    },
  },
  Intégrations: {
    emoji: "🔗",
    intro:
      "Sans integrations natives, une plateforme reste une ile. On a investi gros sur les connecteurs francais (Sekoia, HarfangLab, Lucca, GLPI, CISO Assistant) que les acteurs internationaux n'envisagent meme pas.",
    palette: {
      bg: "from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40",
      ring: "border-cyan-200 dark:border-cyan-900/40",
      badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
      accent: "text-cyan-700 dark:text-cyan-300",
    },
  },
  Écosystème: {
    emoji: "🌱",
    intro:
      "Une plateforme cyber ne vit pas seule. Elle s'inscrit dans un ecosysteme - financements, assureurs, partenaires. Voici ou nous en sommes, sans embellir.",
    palette: {
      bg: "from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40",
      ring: "border-emerald-200 dark:border-emerald-900/40",
      badge:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
      accent: "text-emerald-700 dark:text-emerald-300",
    },
  },
};

const CATEGORIES = Array.from(new Set(ROWS.map((r) => r.category)));

const STATUS_STYLE = {
  win: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/40",
  equal:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/40",
  loss: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900/40",
  na: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-slate-800/40 dark:text-gray-400 dark:border-slate-700",
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
  loss: "Ce qu'on apprend d'eux",
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
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ============================================================
          1. HERO - invitation a la comparaison transparente
          ============================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Transparence radicale · sans embellir
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Comparatif <span className="text-accent-500">honnête</span>.
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            On vous dit franchement ce qu'on fait mieux que nos concurrents,
            ce qu'on fait équivalent, et ce qu'on apprend d'eux. Avec liens
            vers leurs sites pour que vous vérifiiez par vous-même.
          </p>

          {/* Stats compactes (3 mini-cards animees) */}
          <div className="grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto mt-8 text-sm">
            <div
              className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 p-4 shadow-sm animate-slide-up"
              style={{ animationDelay: "320ms" }}
            >
              <p className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                {winsHumanix}
              </p>
              <p className="text-emerald-800 dark:text-emerald-200 font-medium">
                avantages HumaniX
              </p>
            </div>
            <div
              className="rounded-2xl border-2 border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40 p-4 shadow-sm animate-slide-up"
              style={{ animationDelay: "420ms" }}
            >
              <p className="text-3xl font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
                {equalHumanix}
              </p>
              <p className="text-amber-800 dark:text-amber-200 font-medium">
                équivalences sereines
              </p>
            </div>
            <div
              className="rounded-2xl border-2 border-rose-200 dark:border-rose-900/40 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40 p-4 shadow-sm animate-slide-up"
              style={{ animationDelay: "520ms" }}
            >
              <p className="text-3xl font-extrabold text-rose-700 dark:text-rose-300 tabular-nums">
                {lossesHumanix}
              </p>
              <p className="text-rose-800 dark:text-rose-200 font-medium">
                pistes d'amélioration assumées
              </p>
            </div>
          </div>
        </section>
      </HexBackdrop>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
        {/* ============================================================
            2. ENGAGEMENT EDITORIAL + NOTE TRANSPARENCE
            ============================================================ */}
        <section className="grid md:grid-cols-2 gap-5">
          <div
            className="rounded-3xl border-2 border-primary-200 dark:border-primary-900/40 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 p-6 shadow-sm animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-2 flex items-center gap-2">
              <span aria-hidden="true">📝</span>
              <span>Notre engagement éditorial</span>
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
              Cette page est mise à jour <strong>à chaque sortie produit majeure</strong>{" "}
              - la nôtre comme celle des concurrents.{" "}
              <strong>Refresh mai 2026 :</strong> Mantra a été racheté par Cyber
              Guru (Italie) en mars 2025 - on a remplacé la colonne. On a aussi
              ajouté <strong>Adaptive Security</strong> (US, $136M levés dont
              Series B 81M en 2025 par Bain Capital, NVIDIA, OpenAI Fund, a16z),
              le disrupteur AI-native du marché. Si vous voyez une information
              inexacte, écrivez à{" "}
              <a
                href="mailto:contact@humanix-cybersecurity.fr"
                className="text-accent-500 underline font-medium"
              >
                contact@humanix-cybersecurity.fr
              </a>{" "}
              : on corrige sous 7 jours et on cite votre signalement.
            </p>
          </div>

          <div
            className="rounded-3xl border-2 border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40 p-6 shadow-sm animate-slide-up"
            style={{ animationDelay: "200ms" }}
          >
            <h2 className="font-display text-xl font-extrabold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
              <span aria-hidden="true">🪟</span>
              <span>Note transparence : modules pédagogiques</span>
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
              Notre catalogue affiche 180 modules. À ce jour,{" "}
              <strong>
                {expertCount} épisode{expertCount > 1 ? "s ont" : " a"} un
                scénario détaillé rédigé par un expert
              </strong>{" "}
              (badge 📝 sur{" "}
              <Link href="/apprendre" className="text-accent-500 underline">
                /apprendre
              </Link>
              ). Les autres utilisent un fallback structuré (questions, quiz,
              débrief générique). C'est la même mécanique que chez la plupart
              des concurrents listés, mais la plupart ne le disent pas. Cible
              Q3 2026 : 30 modules expert sur les saisons critiques.
            </p>
          </div>
        </section>

        {/* ============================================================
            3. LEGENDE - sereine et chaleureuse
            ============================================================ */}
        <section
          aria-label="Légende des statuts"
          className="grid sm:grid-cols-4 gap-3 text-xs"
        >
          {(
            [
              {
                key: "win" as const,
                label: "Avantage HumaniX",
                hint: "On fait mieux que les concurrents listés.",
              },
              {
                key: "equal" as const,
                label: "Équivalent",
                hint: "Performance comparable, choix sur d'autres critères.",
              },
              {
                key: "loss" as const,
                label: "Ce qu'on apprend d'eux",
                hint: "Ils font mieux ici. On en tire des leviers d'amélioration.",
              },
              {
                key: "na" as const,
                label: "Non applicable",
                hint: "Critère non pertinent ou non documenté.",
              },
            ] as const
          ).map((legend, idx) => (
            <div
              key={legend.key}
              className={`p-3 rounded-2xl border-2 ${STATUS_STYLE[legend.key]} animate-slide-up`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <span className="font-bold flex items-center gap-1.5">
                <span aria-hidden="true">{STATUS_ICON[legend.key]}</span>
                <span>{legend.label}</span>
              </span>
              <p className="mt-1 leading-relaxed">{legend.hint}</p>
            </div>
          ))}
        </section>

        {/* ============================================================
            4. CHAPITRES - chaque categorie devient un chapitre
            avec son intro narratif et son tableau dedie.
            ============================================================ */}
        <section className="space-y-12 pt-2">
          {CATEGORIES.map((cat, catIdx) => {
            const meta = CATEGORY_META[cat];
            const rows = ROWS.filter((r) => r.category === cat);
            return (
              <article
                key={cat}
                aria-labelledby={`cat-${catIdx}`}
                className="animate-slide-up"
                style={{ animationDelay: `${catIdx * 80}ms` }}
              >
                {/* En-tete chapitre */}
                <div
                  className={`rounded-3xl border-2 ${meta.palette.ring} bg-gradient-to-br ${meta.palette.bg} p-6 sm:p-8 shadow-sm mb-4`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="text-5xl sm:text-6xl shrink-0 select-none"
                    >
                      {meta.emoji}
                    </span>
                    <div className="flex-1">
                      <p
                        className={`text-[10px] uppercase tracking-[0.25em] font-bold ${meta.palette.accent} mb-1`}
                      >
                        Chapitre {catIdx + 1} · {rows.length} critère
                        {rows.length > 1 ? "s" : ""}
                      </p>
                      <h2
                        id={`cat-${catIdx}`}
                        className={`font-display text-2xl sm:text-3xl font-extrabold ${meta.palette.accent} leading-tight mb-2`}
                      >
                        {cat}
                      </h2>
                      <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 leading-relaxed italic">
                        {meta.intro}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tableau du chapitre */}
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
                  <table
                    className="w-full border-collapse min-w-[1100px] bg-white dark:bg-slate-900"
                    aria-label={`Comparatif Humanix Académie versus concurrents - ${cat}`}
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
                      <Fragment>
                        {rows.map((row, idx) => (
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
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </section>

        {/* ============================================================
            5. NOTRE LECTURE STRATEGIQUE - version cosy
            ============================================================ */}
        <section
          aria-labelledby="lecture-title"
          className="rounded-3xl border-2 border-primary-200 dark:border-primary-900/40 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 p-6 sm:p-10 shadow-sm animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Lecture stratégique · mai 2026
          </p>
          <h2
            id="lecture-title"
            className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-5 leading-tight"
          >
            Ce que ces lignes racontent vraiment.
          </h2>
          <div className="space-y-4 text-sm sm:text-base text-gray-700 dark:text-gray-200 leading-relaxed">
            <p>
              <strong className="text-primary-500 dark:text-accent-300">
                Là où nous gagnons structurellement
              </strong>{" "}
              - souveraineté FR end-to-end, AGPLv3 auditable, écosystème
              connecteurs FR/UE, marketplace ouverte, accessibilité, programme
              famille, pack NIS2 par-tenant, MCP server premier mover. Ces
              choix sont structurels, difficiles à copier rapidement par des
              acteurs internationaux focalisés sur le mid-market US.
            </p>
            <p>
              <strong className="text-primary-500 dark:text-accent-300">
                Ce qu'on apprend des acteurs historiques
              </strong>{" "}
              - volume catalogue, plugin Outlook mature, agent IA orchestrateur,
              SAML/SCIM enterprise. Ces écarts sont réels mais ne sont pas
              bloquants pour une PME de moins de 250 personnes. On comble
              progressivement (vishing et smishing souverains FR MVP livrés,
              audit RGAA cabinet à venir, Qualiopi en cours).
            </p>
            <p>
              <strong className="text-primary-500 dark:text-accent-300">
                Le vrai disrupteur 2026 - Adaptive Security
              </strong>{" "}
              (US, $136M levés en moins de 2 ans, premier investissement cyber
              d'OpenAI) ne joue pas dans la même catégorie tarifaire ni
              réglementaire. Pour une organisation française soumise à NIS2 ou
              DORA, le Cloud Act sur leur stack OpenAI/AWS US reste un signal
              rouge. On offre une alternative AI-native souveraine : Mistral
              (Paris) + Piper TTS (local) + Scaleway (Paris) - la <em>seule</em>{" "}
              stack 100 % FR/UE pour les attaques voice deepfake.
            </p>
            <p>
              <strong className="text-primary-500 dark:text-accent-300">
                Notre conviction
              </strong>{" "}
              - pour une PME française qui démarre une démarche cyber, payer 5
              à 10 fois moins cher pour 80 % des fonctionnalités utiles, et
              bénéficier d'un accompagnement humain plutôt que d'un support
              tier-3 anglophone, est le bon arbitrage. Pour une ETI multi-pays
              avec besoins SSO/SCIM lourds, les acteurs historiques restent
              plus adaptés. Pour une organisation soumise à NIS2/DORA qui veut
              garder ses preuves dans l'UE, on est seuls sur ce créneau combiné
              cyber + humain + souverain.
            </p>
          </div>
        </section>

        {/* ============================================================
            6. CTA FINAL - invitation cosy (pas "14 jours gratuits")
            ============================================================ */}
        <section
          aria-labelledby="cta-title"
          className="relative rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-white text-center p-8 sm:p-12 shadow-xl overflow-hidden animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          <div
            aria-hidden="true"
            className="absolute -top-12 -right-8 text-[180px] opacity-10 select-none pointer-events-none rotate-12"
          >
            🔍
          </div>
          <p className="text-xs uppercase tracking-[0.25em] font-bold opacity-80 mb-2 relative">
            À votre tour
          </p>
          <h2
            id="cta-title"
            className="font-display text-3xl sm:text-4xl font-extrabold mb-3 leading-tight relative"
          >
            Faites votre propre comparaison.
          </h2>
          <p className="opacity-90 mb-6 max-w-xl mx-auto text-base sm:text-lg leading-relaxed relative">
            Aucun comparatif ne remplace votre intuition de terrain. Ouvrez
            notre démo, regardez ce qui vous parle, confrontez avec vos
            critères réels - et écrivez-nous si on s'est trompé quelque part.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
            <Link
              href="/connexion"
              className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
            >
              Ouvrir une démo (sans carte)
            </Link>
            <Link
              href="/audit-flash"
              className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition"
            >
              Photo claire de la maturité (5 min)
            </Link>
          </div>
        </section>

        {/* ============================================================
            7. CITATION FINALE - signature cosy "Hex veille"
            ============================================================ */}
        <section className="text-center pt-8 pb-4">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « La transparence n'est pas une faiblesse commerciale - c'est la
            seule manière sérieuse de parler de cyber. On préfère perdre un
            prospect honnêtement que le gagner sur un malentendu. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
          >
            - Hex veille
          </p>
        </section>

        {/* ============================================================
            8. MENTIONS LEGALES - publicité comparative (L.122-1 et s.)
            ============================================================ */}
        <section
          aria-labelledby="comparatif-legal-title"
          className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-slate-800 pt-6 mt-12 leading-relaxed"
        >
          <h2
            id="comparatif-legal-title"
            className="font-bold uppercase tracking-widest text-[10px] mb-2"
          >
            Mentions légales - publicité comparative
          </h2>
          <p className="mb-2">
            Cette page constitue une <strong>publicité comparative</strong> au
            sens des articles L.122-1 à L.122-7 du Code de la consommation et
            de la directive 2006/114/CE. Elle compare des services répondant
            aux mêmes besoins (sensibilisation cybersécurité humaine en B2B)
            sur des caractéristiques objectives, pertinentes, vérifiables et
            représentatives.
          </p>
          <p className="mb-2">
            Les informations relatives aux concurrents sont issues de leurs
            sites publics, communiqués de presse, fiches produits commerciales
            et témoignages publics, à la date de dernière mise à jour
            indiquée. Elles sont susceptibles d&apos;évoluer ; nous corrigeons
            toute donnée erronée signalée à{" "}
            <a
              href="mailto:contact@humanix-cybersecurity.fr"
              className="underline"
            >
              contact@humanix-cybersecurity.fr
            </a>{" "}
            sous 5 jours ouvrés.
          </p>
          <p className="mb-2">
            <strong>Marques déposées</strong> : KnowBe4®, Hoxhunt®, Phished®,
            Cyber Guru®, Adaptive Security®, Mantra® sont des marques de leurs
            propriétaires respectifs, citées à seule fin d&apos;identification
            dans le cadre de la comparaison. Aucune affiliation, partenariat
            ou endossement par ces tiers n&apos;est suggéré.
          </p>
          <p>
            Cette comparaison ne dispense pas l&apos;acheteur d&apos;une
            évaluation personnelle des solutions sur la base de ses propres
            critères et contexte. Pour toute contestation, le tribunal
            compétent est celui du siège social d&apos;Humanix Cybersecurity.
          </p>
        </section>
      </div>
    </main>
  );
}
