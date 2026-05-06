// SPDX-License-Identifier: AGPL-3.0-or-later
// Page hub /integrations.
// Vue d'ensemble visuelle de tous les connecteurs livres + a venir.
// A11y RGAA AA, UI/UX différenciante (cartes filtrables, stamps statut FR/UE/US).
//
// Refonte cosy mai 2026 :
//  - Hero HexBackdrop avec sous-titre "souverainete par defaut"
//  - Stats bandeau en cards palette saisons (au lieu de Stat custom)
//  - Citation finale "Hex veille" qui rappelle l'engagement ecosysteme
//  - Cards integration inchangees (composant separe)

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";

export const metadata = {
  title: "Connecteurs & intégrations - Humanix Académie",
  description:
    "Tous les connecteurs natifs Humanix : GRC, SIEM, IAM, ITSM, RH. Hub-and-spoke avec priorité souveraineté française. Standards ouverts (OSCAL, SCIM, CEF, CIM, ECS).",
};

type IntegrationStatus = "live" | "beta" | "roadmap";

type Integration = {
  slug: string;
  name: string;
  category:
    | "GRC / Conformité"
    | "SIEM / Logs"
    | "IAM / Annuaires"
    | "ITSM / Tickets"
    | "RH / Provisioning"
    | "Email security"
    | "Standards"
    | "Agents IA";
  status: IntegrationStatus | "on-demand";
  origin: "FR" | "EU" | "US" | "Standard";
  description: string;
  href?: string;
  releasedAt?: string;
  emoji: string;
};

const INTEGRATIONS: Integration[] = [
  // ============ Standards (livre) ============
  {
    slug: "ciso-assistant",
    name: "CISO Assistant (intuitem)",
    category: "GRC / Conformité",
    status: "live",
    origin: "FR",
    description:
      "Connecteur natif vers l'outil GRC souverain français. Mapping ISO 27001, NIS2, RGPD, ANSSI HG, NIST CSF. Connecteur Python autonome MIT.",
    href: "/integrations/ciso-assistant",
    releasedAt: "Mai 2026",
    emoji: "🔗",
  },
  {
    slug: "oscal",
    name: "Format OSCAL v1.1.2 (NIST)",
    category: "Standards",
    status: "live",
    origin: "Standard",
    description:
      "Format pivot officiel NIST. Compatibilité instantanée avec Eramba, OpenSCAP, RegScale et tout outil OSCAL-aware. Sortie via /api/v1/evidence-export?format=oscal-v1.",
    href: "/integrations/ciso-assistant",
    releasedAt: "Mai 2026",
    emoji: "📜",
  },
  {
    slug: "webhooks",
    name: "Webhooks signés HMAC",
    category: "Standards",
    status: "live",
    origin: "Standard",
    description:
      "Push d'events temps réel avec signature HMAC-SHA256, SSRF-safe, timeout strict. Compatible Zapier, n8n, Make, ou votre SIEM custom.",
    href: "/integrations/webhooks",
    releasedAt: "Mai 2026",
    emoji: "📡",
  },
  {
    slug: "scim",
    name: "SCIM v2 (RFC 7643/7644)",
    category: "IAM / Annuaires",
    status: "live",
    origin: "Standard",
    description:
      "Provisioning automatique des utilisateurs depuis Microsoft Entra ID, Okta, Google Workspace, Keycloak. Standard ouvert, schema extensible.",
    href: "/integrations/scim",
    releasedAt: "Mai 2026",
    emoji: "🔄",
  },
  {
    slug: "outlook",
    name: "Add-in Outlook",
    category: "Email security",
    status: "live",
    origin: "US",
    description:
      "Bouton 'signaler ce phishing' dans Outlook. Notification temps réel à l'admin Humanix + log d'audit.",
    href: "/integrations/outlook",
    releasedAt: "Avr 2026",
    emoji: "📨",
  },
  // ============ MCP Server (premier mover SAT/HRM) ============
  {
    slug: "mcp-server",
    name: "MCP Server (Anthropic Model Context Protocol)",
    category: "Agents IA",
    status: "live",
    origin: "Standard",
    description:
      "Premier MCP server du marché Security Awareness / Human Risk Management. Branche Claude Desktop, Mistral ou GPT sur les données Humanix en read-only : score conformité, utilisateurs à risque, exports OSCAL, campagnes récentes. Connecteur TypeScript autonome MIT.",
    href: "https://github.com/humanix-cybersecurity/humanix-academie/tree/main/connectors/mcp-server",
    releasedAt: "Mai 2026",
    emoji: "🤖",
  },
  // ============ Sprint 11 - Roadmap ============
  {
    slug: "sentinel",
    name: "Microsoft Sentinel",
    category: "SIEM / Logs",
    status: "live",
    origin: "US",
    description:
      "Workbook Humanix clé en main + Logs Ingestion API + format CEF. Connecteur Python autonome MIT, queries KQL fournies.",
    href: "/integrations/sentinel",
    releasedAt: "Mai 2026",
    emoji: "🛰️",
  },
  {
    slug: "splunk",
    name: "Splunk HEC",
    category: "SIEM / Logs",
    status: "live",
    origin: "US",
    description:
      "Format Splunk CIM v1 (NDJSON) sur /api/v1/evidence-export. Connecteur Python push HEC, dashboards et alertes SPL prêts.",
    href: "/integrations/splunk",
    releasedAt: "Mai 2026",
    emoji: "🔍",
  },
  {
    slug: "cef-format",
    name: "Format ArcSight CEF v1",
    category: "Standards",
    status: "live",
    origin: "Standard",
    description:
      "Format CEF (Common Event Format) sur /api/v1/evidence-export?format=sentinel-cef-v1. Compatible tout SIEM CEF (ArcSight, QRadar, Sekoia, Wazuh, Graylog).",
    href: "/integrations/sentinel",
    releasedAt: "Mai 2026",
    emoji: "📋",
  },
  // ============ Sprint 12 - Cocorico PME 🇫🇷 (livre) ============
  {
    slug: "lucca",
    name: "Lucca",
    category: "RH / Provisioning",
    status: "live",
    origin: "FR",
    description:
      "À l'embauche d'un collab dans Lucca, son compte Humanix est créé automatiquement via SCIM v2 + onboarding cyber poussé. Soft-delete au départ.",
    href: "/integrations/lucca",
    releasedAt: "Mai 2026",
    emoji: "🇫🇷",
  },
  {
    slug: "glpi",
    name: "GLPI",
    category: "ITSM / Tickets",
    status: "live",
    origin: "FR",
    description:
      "Bridge Python qui transforme les webhooks signés Humanix en tickets GLPI 10.x sur la file Sécurité. ITSM le plus déployé en PME française.",
    href: "/integrations/glpi",
    releasedAt: "Mai 2026",
    emoji: "🎫",
  },
  {
    slug: "cybermalveillance",
    name: "CyberMalveillance.gouv.fr",
    category: "Standards",
    status: "live",
    origin: "FR",
    description:
      "Liaison avec le dispositif national : ressources officielles intégrées dans la librairie, lien dans la procédure incident, démarche de référencement officiel en cours.",
    href: "/integrations/cybermalveillance",
    releasedAt: "Mai 2026",
    emoji: "🇫🇷",
  },
  // ============ Sprint 13 - Souverains FR (livre) ============
  {
    slug: "sekoia",
    name: "Sekoia.io",
    category: "SIEM / Logs",
    status: "live",
    origin: "FR",
    description:
      "SIEM/XDR souverain. Connecteur Python push CEF vers leur Intake API. Stack 100 % souveraine pour la conformité NIS2/ANSSI.",
    href: "/integrations/sekoia",
    releasedAt: "Mai 2026",
    emoji: "🇫🇷",
  },
  {
    slug: "harfanglab",
    name: "HarfangLab",
    category: "SIEM / Logs",
    status: "live",
    origin: "FR",
    description:
      "EDR souverain - connecteur bidirectionnel. Push : preuves CEF. Pull : alertes EDR transformées en campagnes de sensibilisation ciblées Humanix.",
    href: "/integrations/harfanglab",
    releasedAt: "Mai 2026",
    emoji: "🇫🇷",
  },
  {
    slug: "mailinblack-vade",
    name: "Mailinblack & Vade",
    category: "Email security",
    status: "live",
    origin: "FR",
    description:
      "Anti-phishing souverain. Bridge HTTP : mail bloqué → campagne Humanix ciblée pour les destinataires concernés. Cycle court attaque → formation < 5 min.",
    href: "/integrations/mailinblack-vade",
    releasedAt: "Mai 2026",
    emoji: "🇫🇷",
  },
  // ============ Sur demande - hors-FR ============
  {
    slug: "vanta",
    name: "Vanta",
    category: "GRC / Conformité",
    status: "on-demand",
    origin: "US",
    description:
      "GRC US automatisé (SOC2, ISO 27001). Connecteur sur-mesure facturé en prestation séparée - ou consommation directe via format OSCAL existant.",
    emoji: "🇺🇸",
  },
  {
    slug: "drata",
    name: "Drata",
    category: "GRC / Conformité",
    status: "on-demand",
    origin: "US",
    description: "GRC US automatisé. Idem : sur-mesure ou via format OSCAL.",
    emoji: "🇺🇸",
  },
  {
    slug: "servicenow-grc",
    name: "ServiceNow GRC",
    category: "GRC / Conformité",
    status: "on-demand",
    origin: "US",
    description:
      "GRC grand compte. Connecteur sur-mesure facturé en prestation séparée. Format OSCAL consommable directement.",
    emoji: "🇺🇸",
  },
  {
    slug: "eramba",
    name: "Eramba",
    category: "GRC / Conformité",
    status: "on-demand",
    origin: "EU",
    description:
      "GRC open-source suisse. Compatible directement via format OSCAL v1.1.2 - aucun dev nécessaire côté Humanix.",
    emoji: "🇪🇺",
  },
  {
    slug: "crowdstrike",
    name: "CrowdStrike Falcon",
    category: "SIEM / Logs",
    status: "on-demand",
    origin: "US",
    description:
      "EDR US. Connecteur sur-mesure facturé en prestation. Format CEF déjà compatible.",
    emoji: "🇺🇸",
  },
  {
    slug: "qradar",
    name: "IBM QRadar",
    category: "SIEM / Logs",
    status: "on-demand",
    origin: "US",
    description:
      "SIEM grand compte. Format CEF v1 directement compatible - déploiement sur demande client.",
    emoji: "🇺🇸",
  },
];

const CATEGORIES = [
  "GRC / Conformité",
  "SIEM / Logs",
  "IAM / Annuaires",
  "ITSM / Tickets",
  "RH / Provisioning",
  "Email security",
  "Standards",
  "Agents IA",
] as const;

export default function IntegrationsHubPage() {
  const stats = {
    total: INTEGRATIONS.length,
    live: INTEGRATIONS.filter((i) => i.status === "live").length,
    fr: INTEGRATIONS.filter((i) => i.origin === "FR" && i.status === "live")
      .length,
    onDemand: INTEGRATIONS.filter((i) => i.status === "on-demand").length,
  };

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ================================================================
          1. HERO - invitation au hub d'interoperabilite
          ================================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <header
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Hub d'interoperabilite · souverainete par defaut
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Connecteurs &{" "}
            <span className="text-accent-500">integrations.</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Humanix s'integre nativement a ton ecosysteme RSSI. Hub-and-spoke
            avec priorite souverainete francaise et standards ouverts. Aucune
            ile, aucun lock-in, aucune dependance hors UE par defaut.
          </p>
        </header>
      </HexBackdrop>

      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">

      {/* Stats bandeau */}
      <section
        aria-labelledby="stats-title"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10"
      >
        <h2 id="stats-title" className="sr-only">
          Statistiques d'intégration
        </h2>
        <Stat number={stats.live} label="Connecteurs livrés" accent />
        <Stat number={stats.fr} label="Souverains 🇫🇷 livrés" />
        <Stat number={stats.onDemand} label="Sur demande client" />
        <Stat number={stats.total} label="Au catalogue total" />
      </section>

      {/* Liste par catégorie */}
      {CATEGORIES.map((cat) => {
        const items = INTEGRATIONS.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat} aria-labelledby={`cat-${cat}`} className="mb-10">
            <h2
              id={`cat-${cat}`}
              className="text-xl font-extrabold text-primary-500 mb-4 flex items-center gap-2"
            >
              {cat}
              <span className="text-sm font-normal text-gray-500">
                ({items.length})
              </span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((i) => (
                <IntegrationCard key={i.slug} integration={i} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Politique hors-liste */}
      <section
        aria-labelledby="custom-title"
        className="card mb-10 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700"
      >
        <h2
          id="custom-title"
          className="text-xl font-extrabold text-primary-500 mb-3"
        >
          Votre outil n'est pas dans la liste ?
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Trois cas de figure :
        </p>
        <ol className="space-y-2 text-sm list-decimal list-inside">
          <li>
            <strong>Votre outil parle un standard que nous exposons</strong>{" "}
            (OSCAL, SCIM v2, webhook signé, CEF) → la doc suffit, vous codez
            côté client.
          </li>
          <li>
            <strong>Vous voulez un connecteur dédié</strong> → développement
            sur-mesure facturé en prestation séparée. Le connecteur reste votre
            propriété.
          </li>
          <li>
            <strong>L'outil est très répandu</strong> → on l'évalue pour la
            roadmap suivante.
          </li>
        </ol>
        <div className="mt-4">
          <a
            href="mailto:contact@humanix-cybersecurity.fr?subject=Demande%20d'int%C3%A9gration"
            className="btn-primary inline-block"
          >
            Demander un connecteur custom
          </a>
        </div>
      </section>

      {/* ================================================================
          CITATION FINALE - signature cosy "Hex veille"
          ================================================================ */}
      <section className="text-center pt-10 pb-4">
        <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          « Une plateforme cyber qui vit seule est une plateforme qui meurt
          seule. On a investi gros sur les connecteurs francais (Sekoia,
          HarfangLab, Lucca, GLPI, CISO Assistant) que les acteurs
          internationaux n'envisagent meme pas. »
        </blockquote>
        <p
          aria-hidden="true"
          className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
        >
          - Hex veille
        </p>
      </section>
      </div>
    </main>
  );
}

function Stat({
  number,
  label,
  accent,
}: {
  number: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card text-center ${
        accent
          ? "bg-gradient-to-br from-primary-500 to-accent-500 text-white"
          : ""
      }`}
    >
      <p
        className={`text-3xl sm:text-4xl font-extrabold ${
          accent ? "" : "text-primary-500"
        }`}
      >
        {number}
      </p>
      <p
        className={`text-xs uppercase tracking-widest font-bold mt-1 ${
          accent ? "opacity-90" : "text-gray-500"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const { name, description, status, origin, href, releasedAt, emoji } =
    integration;
  const StatusBadge = (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
        status === "live"
          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
          : status === "beta"
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
            : status === "on-demand"
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
              : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300"
      }`}
    >
      {status === "live"
        ? "✓ Livré"
        : status === "beta"
          ? "Beta"
          : status === "on-demand"
            ? "Sur demande"
            : "Roadmap"}
    </span>
  );

  const OriginBadge = (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-slate-700 text-primary-600 dark:text-accent-300"
      title={`Origine : ${origin}`}
    >
      {origin === "FR"
        ? "🇫🇷 FR"
        : origin === "EU"
          ? "🇪🇺 UE"
          : origin === "US"
            ? "🇺🇸 US"
            : "📐 Standard"}
    </span>
  );

  const inner = (
    <article className="card h-full flex flex-col hover:border-accent-500/50 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-3xl" aria-hidden="true">
          {emoji}
        </span>
        <div className="flex flex-col gap-1 items-end">
          {StatusBadge}
          {OriginBadge}
        </div>
      </div>
      <h3 className="text-lg font-extrabold text-primary-500 mb-1">{name}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 flex-1">
        {description}
      </p>
      {releasedAt && (
        <p className="text-xs text-gray-500 mt-3">
          {status === "live" ? "Livré" : "Prévu"} : {releasedAt}
        </p>
      )}
    </article>
  );

  return href ? (
    <Link
      href={href}
      className="block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500 rounded-2xl"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}
