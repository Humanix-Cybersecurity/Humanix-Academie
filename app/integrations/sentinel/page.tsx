// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique Microsoft Sentinel. A11y RGAA AA + UI/UX différenciante :
// schéma SVG flow, snippets KQL prêts, mode d'emploi step-by-step pour
// configurer DCE/DCR/Workbook.

import Link from "next/link";
import CopyableSnippet from "@/components/CopyableSnippet";

export const metadata = {
  title: "Connecteur Microsoft Sentinel - Humanix Académie",
  description:
    "Workbook clé en main + Logs Ingestion API. Vos preuves de sensibilisation arrivent dans Sentinel comme table HumanixCompliance_CL. KQL queries fournies.",
};

const KQL_SCORE = `HumanixCompliance_CL
| where TenantName_s == "Acme Corp" and Framework_s == "ISO27001:2022"
| summarize avg(Score_d) by bin(TimeGenerated, 1d)
| render timechart`;

const KQL_NON_COMPLIANT = `HumanixCompliance_CL
| where Status_s == "non_compliant"
| project TimeGenerated, TenantName_s, Framework_s, ControlRef_s, ControlName_s
| sort by TimeGenerated desc`;

const KQL_ALERT = `// Analytics Rule pour declencher un Incident Sentinel
HumanixCompliance_CL
| where Status_s == "non_compliant" and Score_d < 0.5
| extend AlertEntity = ControlRef_s
| project AlertEntity, ControlName_s, Framework_s, TenantName_s, Score_d`;

export default function SentinelIntegrationPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Intégration · SIEM Microsoft
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Microsoft Sentinel ·{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            workbook clé en main
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Vos preuves de sensibilisation alimentent une table custom{" "}
          <code>HumanixCompliance_CL</code>. Workbook fourni, queries KQL
          fournies. Ingestion via Logs Ingestion API (méthode Microsoft moderne
          recommandée).
        </p>
      </header>

      {/* Schema architecture */}
      <section
        aria-labelledby="archi-title"
        className="card mb-12 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700"
      >
        <h2
          id="archi-title"
          className="text-xl font-extrabold text-primary-500 text-center mb-4"
        >
          Flux d'ingestion
        </h2>

        <svg
          viewBox="0 0 800 220"
          className="w-full max-w-4xl mx-auto"
          role="img"
          aria-label="Schema : Humanix Académie pousse via Logs Ingestion API vers le Data Collection Endpoint Azure, qui transfere via la Data Collection Rule vers la table custom HumanixCompliance_CL, lue par le workbook Sentinel."
        >
          <defs>
            <linearGradient id="g-humanix" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B3D91" />
              <stop offset="100%" stopColor="#00A3A1" />
            </linearGradient>
            <linearGradient id="g-azure" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0078D4" />
              <stop offset="100%" stopColor="#50E6FF" />
            </linearGradient>
            <marker
              id="arrowG"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#00A3A1" />
            </marker>
          </defs>

          {/* Humanix box */}
          <rect
            x="10"
            y="80"
            width="160"
            height="60"
            rx="14"
            fill="url(#g-humanix)"
          />
          <text
            x="90"
            y="115"
            textAnchor="middle"
            fontSize="14"
            fontWeight="800"
            fill="white"
          >
            Humanix
          </text>
          <text
            x="90"
            y="132"
            textAnchor="middle"
            fontSize="10"
            fill="white"
            opacity="0.85"
          >
            (connecteur Python)
          </text>

          {/* DCE */}
          <rect
            x="220"
            y="80"
            width="160"
            height="60"
            rx="14"
            fill="url(#g-azure)"
          />
          <text
            x="300"
            y="110"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            Data Collection
          </text>
          <text
            x="300"
            y="125"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            Endpoint
          </text>

          {/* DCR */}
          <rect
            x="430"
            y="80"
            width="160"
            height="60"
            rx="14"
            fill="url(#g-azure)"
          />
          <text
            x="510"
            y="110"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            Data Collection
          </text>
          <text
            x="510"
            y="125"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            Rule (transform)
          </text>

          {/* Table */}
          <rect
            x="640"
            y="80"
            width="150"
            height="60"
            rx="14"
            fill="url(#g-azure)"
          />
          <text
            x="715"
            y="110"
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fill="white"
          >
            HumanixCompliance_CL
          </text>
          <text
            x="715"
            y="128"
            textAnchor="middle"
            fontSize="10"
            fill="white"
            opacity="0.85"
          >
            (Sentinel + Workbook)
          </text>

          {/* Fleches */}
          <line
            x1="175"
            y1="110"
            x2="215"
            y2="110"
            stroke="#00A3A1"
            strokeWidth="2.5"
            markerEnd="url(#arrowG)"
          />
          <line
            x1="385"
            y1="110"
            x2="425"
            y2="110"
            stroke="#00A3A1"
            strokeWidth="2.5"
            markerEnd="url(#arrowG)"
          />
          <line
            x1="595"
            y1="110"
            x2="635"
            y2="110"
            stroke="#00A3A1"
            strokeWidth="2.5"
            markerEnd="url(#arrowG)"
          />

          <text x="195" y="100" textAnchor="middle" fontSize="9" fill="#555">
            POST
          </text>
          <text x="405" y="100" textAnchor="middle" fontSize="9" fill="#555">
            stream
          </text>
          <text x="615" y="100" textAnchor="middle" fontSize="9" fill="#555">
            ingest
          </text>

          <text x="400" y="195" textAnchor="middle" fontSize="11" fill="#555">
            Auth : OAuth2 client_credentials (Azure AD App Registration) · Role
            : Monitoring Metrics Publisher
          </text>
        </svg>
      </section>

      {/* Setup */}
      <section aria-labelledby="setup-title" className="mb-10">
        <h2
          id="setup-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Setup Azure (10 min, à faire une fois)
        </h2>
        <ol className="space-y-3 text-sm list-decimal list-inside">
          <li>
            <strong>Data Collection Endpoint</strong> : Azure Portal → DCE →
            Create. Notez l'ingestion endpoint URI.
          </li>
          <li>
            <strong>Custom Log Table</strong> : Log Analytics workspace → Tables
            → New custom log (DCR-based). Nom : <code>HumanixCompliance</code>.
            Schéma fourni dans le README du connecteur.
          </li>
          <li>
            <strong>Data Collection Rule</strong> : créée automatiquement avec
            la table. Notez son <em>Immutable ID</em>.
          </li>
          <li>
            <strong>App Registration</strong> : Azure AD → App registrations →
            New. Récupérez Tenant ID, Client ID, Client Secret. Ajoutez le rôle{" "}
            <code>Monitoring Metrics Publisher</code> sur la DCR.
          </li>
          <li>
            <strong>Workbook</strong> : Sentinel → Workbooks → New →{" "}
            <code>&lt;/&gt;</code> → collez le contenu de{" "}
            <code>humanix-workbook.json</code> (fourni avec le connecteur).
          </li>
        </ol>
      </section>

      {/* KQL queries */}
      <section aria-labelledby="kql-title" className="mb-10">
        <h2
          id="kql-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Queries KQL prêtes à l'emploi
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold mb-2 text-primary-500">
              Évolution du score moyen (chart)
            </h3>
            <CopyableSnippet code={KQL_SCORE} label="KQL score timechart" />
          </div>
          <div>
            <h3 className="font-bold mb-2 text-primary-500">
              Contrôles non-conformes
            </h3>
            <CopyableSnippet
              code={KQL_NON_COMPLIANT}
              label="KQL non-compliant"
            />
          </div>
          <div>
            <h3 className="font-bold mb-2 text-primary-500">
              Analytics Rule (déclenche un Incident)
            </h3>
            <CopyableSnippet code={KQL_ALERT} label="KQL analytics rule" />
          </div>
        </div>
      </section>

      <section className="card text-center bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <h2 className="text-2xl font-extrabold mb-2">
          Prêt à brancher Sentinel ?
        </h2>
        <p className="opacity-90 mb-5">
          Le connecteur Python (MIT) + le workbook JSON sont fournis dans le
          repo.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/admin/api-keys"
            className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
          >
            Générer ma clé API
          </Link>
          <Link
            href="/integrations"
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-2xl transition border-2 border-white/30"
          >
            Tous les connecteurs
          </Link>
        </div>
      </section>
    </div>
  );
}
