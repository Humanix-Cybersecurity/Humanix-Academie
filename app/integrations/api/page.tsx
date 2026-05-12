// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /integrations/api
//
// Documentation publique de l'API REST. Le spec OpenAPI 3.0 est
// telechargeable via /api/v1/openapi.json (pour Postman, Insomnia,
// openapi-typescript, openapi-generator).
//
// Cette page liste les 5 endpoints avec exemples curl + reponses JSON
// pour la lecture rapide cote prospect / acheteur. Les vrais devs
// preferent importer le JSON dans leur tool prefere.

import Link from "next/link";

export const metadata = {
  title: "API REST | Humanix Académie",
  description:
    "Documentation OpenAPI 3.0 de l'API publique Humanix Académie. Endpoints utilisateurs, progrès, conformité, exports SIEM (Splunk CIM, Sentinel CEF).",
};

export default function ApiDocPage() {
  return (
    <main className="animate-fadeIn">
      <header className="bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-cyan-950/30 dark:via-slate-900 dark:to-blue-950/20 border-b border-cyan-200 dark:border-cyan-900/40 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Documentation développeur
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-3">
            API REST publique
          </h1>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 max-w-3xl mb-6 leading-relaxed">
            OpenAPI 3.0 — consommez les utilisateurs, progrès, score de
            conformité et exports SIEM depuis vos outils GRC, BI, HRIS.
            Auth Bearer, rate-limit, exports SIEM CEF/CIM.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href="/api/v1/openapi.json"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-500 transition font-medium"
            >
              <span aria-hidden="true">📄</span>
              Télécharger spec OpenAPI 3.0
            </a>
            <Link
              href="/admin/api-keys"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-medium transition"
            >
              <span aria-hidden="true">🔑</span>
              Créer une clé API
            </Link>
            <Link
              href="/integrations/scim"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-500 transition font-medium"
            >
              <span aria-hidden="true">👥</span>
              SCIM 2.0 (provisioning)
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-white dark:bg-slate-900 py-8 px-4 border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-4 text-sm">
          <Tip
            emoji="🔐"
            title="Authentification"
            text="Header Authorization: Bearer hxa_xxx. Crée la clé dans /admin/api-keys (Pro+ minimum)."
          />
          <Tip
            emoji="⚡"
            title="Rate limit"
            text="Variable selon endpoint. Evidence-export plafonné à 10 req/h pour éviter les abus."
          />
          <Tip
            emoji="📦"
            title="Format SIEM"
            text="Endpoint /evidence-export accepte format=splunk-cim-v1 ou sentinel-cef-v1."
          />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        <h2 className="font-display text-2xl font-extrabold text-gray-900 dark:text-gray-100">
          Endpoints
        </h2>

        <Endpoint
          method="GET"
          path="/api/v1/users"
          tag="Users"
          summary="Liste des utilisateurs du tenant"
          description="Retourne les users actifs avec risk score, niveau, dernière connexion. Pour le provisioning, préférer SCIM /scim/v2/Users."
          curl={`curl -X GET "${PUBLIC_URL}/api/v1/users?limit=50" \\
  -H "Authorization: Bearer hxa_xxxxxxxxxxxx"`}
          response={`{
  "users": [
    {
      "id": "clxyz123...",
      "email": "alice@acme.fr",
      "name": "Alice Martin",
      "role": "LEARNER",
      "service": "Comptabilité",
      "isActive": true,
      "riskScore": 72,
      "coins": 145,
      "level": 3,
      "lastSeenAt": "2026-05-09T08:14:23Z"
    }
  ],
  "total": 42
}`}
        />

        <Endpoint
          method="GET"
          path="/api/v1/progress"
          tag="Progress"
          summary="Avancement des utilisateurs"
          description="Rows Progress (un par paire user/episode). Idéal pour exports vers HRIS, BI, SIEM."
          curl={`curl -X GET "${PUBLIC_URL}/api/v1/progress?since=2026-04-01T00:00:00Z" \\
  -H "Authorization: Bearer hxa_xxxxxxxxxxxx"`}
          response={`{
  "progress": [
    {
      "userEmail": "alice@acme.fr",
      "saisonSlug": "phishing",
      "episodeSlug": "01-mail-du-pdg",
      "status": "COMPLETED",
      "score": 85,
      "bestQuizScorePct": 100,
      "completedAt": "2026-05-08T14:23:45Z"
    }
  ],
  "total": 215
}`}
        />

        <Endpoint
          method="GET"
          path="/api/v1/saisons"
          tag="Content"
          summary="Catalogue des saisons / parcours"
          description="Saisons publiées (globales + customs du tenant) avec compteur d'épisodes."
          curl={`curl -X GET "${PUBLIC_URL}/api/v1/saisons" \\
  -H "Authorization: Bearer hxa_xxxxxxxxxxxx"`}
          response={`{
  "saisons": [
    {
      "slug": "phishing",
      "title": "Phishing & ingénierie sociale",
      "coverEmoji": "🎣",
      "order": 1,
      "isPublished": true,
      "episodeCount": 6
    }
  ]
}`}
        />

        <Endpoint
          method="GET"
          path="/api/v1/conformity-score"
          tag="Compliance"
          summary="Score de conformité agrégé"
          description="KPIs agrégés du tenant pour reporting GRC (NIS2, RGPD, ISO 27001)."
          curl={`curl -X GET "${PUBLIC_URL}/api/v1/conformity-score" \\
  -H "Authorization: Bearer hxa_xxxxxxxxxxxx"`}
          response={`{
  "tenantName": "ACME SAS",
  "framework": "ISO27001:2022",
  "masteryAverage": 71.4,
  "activationRate": 92,
  "mandatoryCompletionRate": 78,
  "generatedAt": "2026-05-09T12:00:00Z"
}`}
        />

        <Endpoint
          method="GET"
          path="/api/v1/evidence-export"
          tag="SIEM"
          summary="Export de preuves SIEM-ready"
          description="Format compatible SIEM ou GRC : oscal-v1 (CISO Assistant, Eramba), splunk-cim-v1 (HEC), sentinel-cef-v1 (Sentinel/QRadar)."
          curl={`# Splunk CIM (NDJSON, ingestion HEC directe)
curl -X GET "${PUBLIC_URL}/api/v1/evidence-export?framework=ISO27001:2022&format=splunk-cim-v1" \\
  -H "Authorization: Bearer hxa_xxxxxxxxxxxx"

# Microsoft Sentinel CEF
curl -X GET "${PUBLIC_URL}/api/v1/evidence-export?framework=NIS2&format=sentinel-cef-v1" \\
  -H "Authorization: Bearer hxa_xxxxxxxxxxxx"`}
          response={`# Splunk CIM v1 (NDJSON, 1 event par ligne)
{"time":1715241600,"host":"humanix-academie.fr","sourcetype":"humanix:compliance","event":{"control_id":"A.6.3","status":"compliant","severity":"informational"}}
{"time":1715241600,"host":"humanix-academie.fr","sourcetype":"humanix:compliance","event":{"control_id":"A.7.2","status":"partial","severity":"medium"}}`}
        />
      </section>

      <footer className="max-w-5xl mx-auto px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-slate-800">
        <p>
          Pour le provisioning automatique des utilisateurs (Microsoft Entra
          ID, Okta), préférer{" "}
          <Link
            href="/integrations/scim"
            className="text-accent-500 hover:underline"
          >
            SCIM 2.0
          </Link>
          . Pour les alertes temps réel (Slack, Teams, Jira, ServiceNow,
          PagerDuty), préférer{" "}
          <Link
            href="/admin/integrations"
            className="text-accent-500 hover:underline"
          >
            les webhooks
          </Link>
          .
        </p>
        <p className="mt-3 italic">
          Importez{" "}
          <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            /api/v1/openapi.json
          </code>{" "}
          dans Postman, Insomnia, ou utilisez{" "}
          <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            openapi-typescript
          </code>{" "}
          /{" "}
          <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            openapi-generator
          </code>{" "}
          pour générer un client typé.
        </p>
      </footer>
    </main>
  );
}

const PUBLIC_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";

function Tip({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-slate-800/40 p-4 border border-gray-100 dark:border-slate-800">
      <p className="font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
        <span aria-hidden="true">{emoji}</span> {title}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        {text}
      </p>
    </div>
  );
}

function Endpoint({
  method,
  path,
  tag,
  summary,
  description,
  curl,
  response,
}: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  tag: string;
  summary: string;
  description: string;
  curl: string;
  response: string;
}) {
  const methodColor =
    method === "GET"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : method === "POST"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return (
    <article className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
        <span
          className={`text-xs font-bold tracking-wider px-2 py-1 rounded-md ${methodColor}`}
        >
          {method}
        </span>
        <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
          {path}
        </code>
        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-auto">
          {tag}
        </span>
      </header>
      <div className="px-5 py-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
          {summary}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
          {description}
        </p>
        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1">
              Requête
            </p>
            <pre className="bg-gray-900 text-gray-100 dark:bg-slate-950 rounded-lg p-3 text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
              <code>{curl}</code>
            </pre>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1">
              Réponse (200)
            </p>
            <pre className="bg-gray-50 dark:bg-slate-950 rounded-lg p-3 text-[11px] leading-relaxed overflow-x-auto whitespace-pre border border-gray-100 dark:border-slate-800 text-gray-800 dark:text-gray-200">
              <code>{response}</code>
            </pre>
          </div>
        </div>
      </div>
    </article>
  );
}
