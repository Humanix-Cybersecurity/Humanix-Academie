// Page publique "Comparatif honnête".
// Le pari editorial : poser noir sur blanc nos forces ET nos faiblesses face
// aux concurrents identifies. C'est un acte commercial differencant : aucune
// suite SaaS cyber francaise ne le fait. Cible : prospects PME qui hesitent
// entre HumaniX et un acteur historique (KnowBe4, Mantra, Hoxhunt, Phished).
//
// REGLE EDITORIALE : on doit toujours rester honnete. Si un concurrent ajoute
// une feature qui nous depasse, on l'inscrit ici. Cette page perd sa valeur
// commerciale a la seconde ou elle ment.

import { Fragment } from "react";
import Link from "next/link";

export const metadata = {
  title: "Comparatif honnête — HumaniX vs concurrents | Humanix Académie",
  description:
    "Comparatif honnête entre Humanix Académie et les principales plateformes de sensibilisation cyber (KnowBe4, Mantra, Hoxhunt, Phished). On vous dit où nous sommes meilleurs, équivalents et moins bons.",
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
  mantra: Cell;
  hoxhunt: Cell;
  phished: Cell;
};

const ROWS: Row[] = [
  // -----------------------------------------------------------------------
  // CATÉGORIE : TARIFICATION
  // -----------------------------------------------------------------------
  {
    category: "Tarification",
    feature: "Prix d'entrée pour 10 personnes",
    humanix: {
      status: "win",
      text: "0 € self-host AGPL ou 19 €/mois cloud Starter",
    },
    knowbe4: { status: "loss", text: "~3 500 €/an minimum" },
    mantra: { status: "loss", text: "~2 400 €/an minimum" },
    hoxhunt: { status: "loss", text: "Sur devis (>3 000 €/an)" },
    phished: { status: "loss", text: "~1 800 €/an minimum" },
  },
  {
    category: "Tarification",
    feature: "Code source ouvert (auditabilité)",
    humanix: { status: "win", text: "AGPLv3 — code complet public sur GitHub" },
    knowbe4: { status: "loss", text: "Boîte noire (US)" },
    mantra: { status: "loss", text: "Boîte noire (FR)" },
    hoxhunt: { status: "loss", text: "Boîte noire (FI/US)" },
    phished: { status: "loss", text: "Boîte noire (BE)" },
  },
  {
    category: "Tarification",
    feature: "Tarif transparent affiché publiquement",
    humanix: { status: "win", text: "Oui, grille complète" },
    knowbe4: { status: "loss", text: "Sur devis" },
    mantra: { status: "loss", text: "Sur devis" },
    hoxhunt: { status: "loss", text: "Sur devis" },
    phished: { status: "equal", text: "Partiellement" },
  },
  {
    category: "Tarification",
    feature: "Engagement minimum",
    humanix: { status: "win", text: "Sans engagement" },
    knowbe4: { status: "loss", text: "12 mois minimum" },
    mantra: { status: "equal", text: "12 mois recommandé" },
    hoxhunt: { status: "loss", text: "12 mois minimum" },
    phished: { status: "equal", text: "12 mois recommandé" },
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : CATALOGUE & CONTENU
  // -----------------------------------------------------------------------
  {
    category: "Catalogue & contenu",
    feature: "Nombre de modules disponibles",
    humanix: {
      status: "equal",
      text: "180 modules (25 saisons + marketplace)",
    },
    knowbe4: { status: "win", text: "1 000+ modules" },
    mantra: { status: "equal", text: "300+ modules" },
    hoxhunt: { status: "equal", text: "~100 modules" },
    phished: { status: "win", text: "500+ modules" },
  },
  {
    category: "Catalogue & contenu",
    feature: "Modules en français natifs (non traduits)",
    humanix: { status: "win", text: "100 % FR natif" },
    knowbe4: { status: "loss", text: "Traduits depuis l'anglais" },
    mantra: { status: "win", text: "FR natif" },
    hoxhunt: { status: "loss", text: "Traduction partielle" },
    phished: { status: "equal", text: "Mix FR / traduit" },
  },
  {
    category: "Catalogue & contenu",
    feature: "Marketplace ouverte (modules communauté)",
    humanix: { status: "win", text: "Oui, modulable + auteur visible" },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Catalogue & contenu",
    feature: "Modules pour la sphère personnelle / famille",
    humanix: {
      status: "win",
      text: "Oui, /famille gratuit + invitations proches",
    },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : SIMULATION PHISHING
  // -----------------------------------------------------------------------
  {
    category: "Simulation phishing",
    feature: "Campagnes phishing simulé",
    humanix: { status: "equal", text: "Oui, templates FR" },
    knowbe4: { status: "win", text: "Référence du marché" },
    mantra: { status: "equal", text: "Oui, IA-personnalisé" },
    hoxhunt: { status: "win", text: "IA + adaptive learning" },
    phished: { status: "equal", text: "Oui, automatisation" },
  },
  {
    category: "Simulation phishing",
    feature: "Plugin Outlook / Gmail (bouton « Signaler »)",
    humanix: { status: "equal", text: "Add-in Outlook livré (Gmail à venir)" },
    knowbe4: { status: "win", text: "Oui, mature + Gmail" },
    mantra: { status: "win", text: "Oui + Gmail" },
    hoxhunt: { status: "win", text: "Oui, intégré + Gmail" },
    phished: { status: "win", text: "Oui + Gmail" },
  },
  {
    category: "Simulation phishing",
    feature: "IA générative pour personnaliser les phishings",
    humanix: { status: "win", text: "Oui — Mistral souverain FR (RGPD natif)" },
    knowbe4: { status: "equal", text: "Oui (USA, Cloud Act)" },
    mantra: { status: "equal", text: "Oui (UE)" },
    hoxhunt: { status: "equal", text: "Oui (FI)" },
    phished: { status: "equal", text: "Oui (BE)" },
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : CONFORMITÉ & SOUVERAINETÉ
  // -----------------------------------------------------------------------
  {
    category: "Conformité & souveraineté",
    feature: "Hébergement 100 % France",
    humanix: { status: "win", text: "Oui, Scaleway Paris" },
    knowbe4: { status: "loss", text: "USA + UE multi-régions" },
    mantra: { status: "equal", text: "UE (FR optionnel)" },
    hoxhunt: { status: "loss", text: "Finlande / UE" },
    phished: { status: "equal", text: "Belgique / UE" },
  },
  {
    category: "Conformité & souveraineté",
    feature: "DPA + Registre RGPD pré-remplis",
    humanix: { status: "win", text: "Oui, fournis dès trial" },
    knowbe4: { status: "equal", text: "Sur demande" },
    mantra: { status: "equal", text: "Sur demande" },
    hoxhunt: { status: "loss", text: "DPA seul" },
    phished: { status: "equal", text: "Sur demande" },
  },
  {
    category: "Conformité & souveraineté",
    feature: "Pack NIS2 prêt à signer (par-tenant)",
    humanix: { status: "win", text: "Oui, livré 2026" },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Conformité & souveraineté",
    feature: "Accessibilité RGAA / WCAG 2.1 AA",
    humanix: {
      status: "win",
      text: "Conformité interne 88 %, audit cabinet à venir",
    },
    knowbe4: { status: "equal", text: "WCAG partiel" },
    mantra: { status: "equal", text: "WCAG partiel" },
    hoxhunt: { status: "equal", text: "WCAG partiel" },
    phished: { status: "loss", text: "Non documenté" },
  },
  {
    category: "Conformité & souveraineté",
    feature: "Rapport d'audit de sécurité public",
    humanix: {
      status: "win",
      text: "Oui, PDF public + Markdown versionné Git",
    },
    knowbe4: { status: "equal", text: "SOC 2 Type II (sur demande NDA)" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "equal", text: "ISO 27001 (sur demande NDA)" },
    phished: { status: "loss", text: "Non" },
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : PILOTAGE & DASHBOARD
  // -----------------------------------------------------------------------
  {
    category: "Pilotage dirigeant",
    feature: "Dashboard CODIR (mode présentation)",
    humanix: { status: "win", text: "Oui, plein écran COMEX" },
    knowbe4: { status: "equal", text: "Dashboard exec partiel" },
    mantra: { status: "equal", text: "Dashboard exec" },
    hoxhunt: { status: "win", text: "Dashboard exec mature" },
    phished: { status: "equal", text: "Dashboard exec partiel" },
  },
  {
    category: "Pilotage dirigeant",
    feature: "Live Attack Map temps réel (SSE)",
    humanix: { status: "win", text: "Oui, dashboard live" },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Pilotage dirigeant",
    feature: "Cyber-météo France (alerte cyber nationale CERT-FR)",
    humanix: { status: "win", text: "Oui, intégré (souverain)" },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Pilotage dirigeant",
    feature: "Posters PDF mensuels personnalisés (open-space)",
    humanix: { status: "win", text: "Oui, 12 thèmes/an, A3 imprimable" },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Pilotage dirigeant",
    feature: "Observatoire des fuites de données françaises",
    humanix: { status: "win", text: "Oui, 3 sources agrégées (FR)" },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Pilotage dirigeant",
    feature: "Calcul ROI cyber en €",
    humanix: { status: "win", text: "Oui, cf. Impact Business" },
    knowbe4: { status: "equal", text: "Add-on payant" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "equal", text: "Add-on payant" },
    phished: { status: "loss", text: "Non" },
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : INTÉGRATIONS
  // -----------------------------------------------------------------------
  {
    category: "Intégrations",
    feature: "Webhooks Slack / Teams natifs",
    humanix: { status: "win", text: "Oui, sans setup IT" },
    knowbe4: { status: "win", text: "Oui (PRO)" },
    mantra: { status: "win", text: "Oui" },
    hoxhunt: { status: "win", text: "Oui" },
    phished: { status: "equal", text: "Email seulement" },
  },
  {
    category: "Intégrations",
    feature: "SSO Google / Microsoft (1-clic)",
    humanix: { status: "win", text: "Oui (natif Auth.js v5)" },
    knowbe4: { status: "equal", text: "Oui (Enterprise)" },
    mantra: { status: "equal", text: "Oui" },
    hoxhunt: { status: "equal", text: "Oui" },
    phished: { status: "equal", text: "Oui" },
  },
  {
    category: "Intégrations",
    feature: "SAML 2.0 / SCIM provisioning",
    humanix: { status: "equal", text: "Sur demande contrats > 50 users" },
    knowbe4: { status: "win", text: "Oui (Enterprise)" },
    mantra: { status: "win", text: "Oui" },
    hoxhunt: { status: "win", text: "Oui" },
    phished: { status: "win", text: "Oui" },
  },
  {
    category: "Intégrations",
    feature: "Connecteur GRC natif (CISO Assistant)",
    humanix: {
      status: "win",
      text: "Oui — endpoint /api/v1/evidence-export + connecteur Python",
    },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Intégrations",
    feature: "Format OSCAL v1.1.2 (NIST) — preuves portables",
    humanix: {
      status: "win",
      text: "Oui — format=oscal-v1, compatible Eramba/RegScale",
    },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Intégrations",
    feature: "SCIM v2 auto-provisioning (Entra/Okta/Google)",
    humanix: {
      status: "win",
      text: "Oui — RFC 7643/7644, extension custom Humanix",
    },
    knowbe4: { status: "equal", text: "Oui (Enterprise)" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "equal", text: "Oui" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Intégrations",
    feature: "Webhooks signés HMAC + doc publique",
    humanix: {
      status: "win",
      text: "Oui — HMAC-SHA256, SSRF-safe, doc Stripe-like",
    },
    knowbe4: { status: "equal", text: "Oui (basique)" },
    mantra: { status: "equal", text: "Oui" },
    hoxhunt: { status: "equal", text: "Oui" },
    phished: { status: "loss", text: "Email seulement" },
  },
  {
    category: "Intégrations",
    feature: "Connecteur Microsoft Sentinel + workbook clé en main",
    humanix: {
      status: "win",
      text: "Oui — Logs Ingestion API + workbook JSON fourni",
    },
    knowbe4: { status: "equal", text: "Doc partielle, pas de workbook" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Intégrations",
    feature: "Connecteur Splunk HEC + SPL queries fournies",
    humanix: {
      status: "win",
      text: "Oui — format CIM v1 + connecteur Python MIT",
    },
    knowbe4: { status: "equal", text: "Format propriétaire" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Intégrations",
    feature: "Connecteurs souverains 🇫🇷 (Sekoia, HarfangLab, Mailinblack/Vade)",
    humanix: { status: "win", text: "Oui — 3 connecteurs FR natifs MIT" },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Intégrations",
    feature: "Connecteur HR souverain (Lucca → SCIM)",
    humanix: { status: "win", text: "Oui — connecteur Python MIT" },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Intégrations",
    feature: "Plugin GLPI (ITSM le plus déployé en PME FR)",
    humanix: { status: "win", text: "Oui — bridge Python avec tickets auto" },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Intégrations",
    feature: "Liaison CyberMalveillance.gouv.fr",
    humanix: {
      status: "win",
      text: "Oui — référencement officiel + ressources intégrées",
    },
    knowbe4: { status: "loss", text: "Non (acteur US)" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "loss", text: "Non (acteur FI)" },
    phished: { status: "loss", text: "Non (acteur BE)" },
  },

  // -----------------------------------------------------------------------
  // CATÉGORIE : ÉCOSYSTÈME
  // -----------------------------------------------------------------------
  {
    category: "Écosystème",
    feature: "Certification Qualiopi (financement OPCO)",
    humanix: { status: "equal", text: "Sur demande contrats > 50 users" },
    knowbe4: { status: "loss", text: "Non" },
    mantra: { status: "equal", text: "Partenaire OF" },
    hoxhunt: { status: "loss", text: "Non" },
    phished: { status: "loss", text: "Non" },
  },
  {
    category: "Écosystème",
    feature: "Partenariats assureurs cyber",
    humanix: { status: "loss", text: "En négociation 2026" },
    knowbe4: { status: "win", text: "Oui (USA / UE)" },
    mantra: { status: "loss", text: "Non" },
    hoxhunt: { status: "equal", text: "Quelques accords" },
    phished: { status: "loss", text: "Non" },
  },
];

const COMPETITORS = [
  { key: "knowbe4" as const, name: "KnowBe4", site: "https://www.knowbe4.com" },
  { key: "mantra" as const, name: "Mantra", site: "https://mantra.ms" },
  { key: "hoxhunt" as const, name: "Hoxhunt", site: "https://hoxhunt.com" },
  { key: "phished" as const, name: "Phished", site: "https://phished.io" },
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
          des concurrents). Si vous constatez une information inexacte, écrivez
          à{" "}
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

      {/* Tableau */}
      <div className="overflow-x-auto -mx-4 px-4 mb-10">
        <table
          className="w-full border-collapse min-w-[900px]"
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
                    <StatusCell cell={row.knowbe4} />
                    <StatusCell cell={row.mantra} />
                    <StatusCell cell={row.hoxhunt} />
                    <StatusCell cell={row.phished} />
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
          Notre lecture stratégique
        </h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            <strong className="text-primary-500">Là où nous gagnons</strong>{" "}
            (souveraineté, transparence tarifaire, marketplace ouverte,
            accessibilité, programme famille, pack NIS2 par-tenant) : ces choix
            sont structurels, difficiles à copier rapidement par des acteurs
            internationaux focalisés sur le mid-market.
          </p>
          <p>
            <strong className="text-primary-500">Là où ils gagnent</strong>{" "}
            (volume catalogue, plugin Outlook mature, IA générative, SSO/SAML) :
            ces écarts sont réels mais ne sont pas bloquants pour une PME de
            moins de 250 personnes. Nous comblons progressivement (plugin
            Outlook prévu à venir, audit RGAA cabinet à venir, Qualiopi en
            cours).
          </p>
          <p>
            <strong className="text-primary-500">Notre conviction</strong> :
            pour une PME française qui démarre une démarche cyber, payer 5 à 10
            fois moins cher pour 80 % des fonctionnalités utiles — et bénéficier
            d'un accompagnement humain plutôt que d'un support tier-3 anglophone
            — est le bon arbitrage. Pour une ETI multi-pays avec besoins
            SSO/SCIM lourds, les acteurs historiques restent plus adaptés.
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
