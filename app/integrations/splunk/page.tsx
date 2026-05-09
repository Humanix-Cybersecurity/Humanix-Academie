// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique Splunk. A11y RGAA AA. UI/UX différenciante : SPL queries
// prêtes à coller, mode d'emploi HEC, snippet curl.

import Link from "next/link";
import CopyableSnippet from "@/components/CopyableSnippet";

export const metadata = {
  title: "Connecteur Splunk HEC - Humanix Académie",
  description:
    "Poussez les preuves de conformité Humanix vers votre Splunk via HEC. Format Splunk CIM v1, NDJSON, SPL queries fournies, dashboards prêts à l'emploi.",
};

const CURL_SNIPPET = `curl -H "Authorization: Bearer hxa_VOTRE_CLE_API" \\
  "https://academie.humanix-cybersecurity.fr/api/v1/evidence-export?framework=ISO27001:2022&format=splunk-cim-v1" \\
  | curl -k "https://splunk.exemple.fr:8088/services/collector/event" \\
      -H "Authorization: Splunk YOUR_HEC_TOKEN" \\
      --data-binary @-`;

const SPL_SCORE = `sourcetype="humanix:compliance:evidence"
| stats avg(compliance_score) as avg_score by framework, tenant_name
| eval avg_score = round(avg_score, 2)`;

const SPL_NON_COMPLIANT = `sourcetype="humanix:compliance:evidence" compliance_status=non_compliant
| table _time tenant_name framework control_ref control_name severity`;

const SPL_ALERT = `sourcetype="humanix:compliance:evidence" severity_id>=7
| stats count by tenant_name, control_ref
| where count >= 1`;

export default function SplunkIntegrationPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Intégration · SIEM
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Splunk HEC ·{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            zero polling
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Vos preuves de sensibilisation Humanix sont ingérées dans Splunk via
          HEC, format Splunk CIM v1. Dashboards et alertes prêts à l'emploi.
        </p>
      </header>

      {/* 1. Mode d'emploi 3 etapes */}
      <section
        aria-labelledby="quickstart-title"
        className="card mb-10 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700"
      >
        <h2
          id="quickstart-title"
          className="text-xl font-extrabold text-primary-500 mb-3"
        >
          Quickstart en 3 étapes
        </h2>
        <ol className="space-y-3 text-sm">
          <li>
            <strong>1.</strong> Splunk →{" "}
            <em>Settings → Data inputs → HTTP Event Collector → New Token</em>.
            Source type : <code>humanix:compliance:evidence</code>. Récupérez le
            token GUID.
          </li>
          <li>
            <strong>2.</strong> Sur Humanix :{" "}
            <Link href="/admin/api-keys" className="font-bold underline">
              générez une clé API
            </Link>{" "}
            (plan Pro ou supérieur).
          </li>
          <li>
            <strong>3.</strong> Lancez le connecteur Python (ou pipez{" "}
            <code>curl → curl</code> comme ci-dessous).
          </li>
        </ol>
      </section>

      {/* 2. Snippet curl */}
      <section aria-labelledby="curl-title" className="mb-10">
        <h2
          id="curl-title"
          className="text-xl font-extrabold text-primary-500 mb-3"
        >
          Snippet curl (test rapide)
        </h2>
        <CopyableSnippet code={CURL_SNIPPET} label="curl pipe Splunk" />
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
          Pour la production, utilisez le{" "}
          <a
            href="https://github.com/humanix-cybersecurity/humanix-splunk-connector"
            className="font-bold underline"
          >
            connecteur Python officiel ↗
          </a>{" "}
          (licence MIT, dry-run, batch, retry).
        </p>
      </section>

      {/* 3. SPL queries pretes */}
      <section aria-labelledby="spl-title" className="mb-10">
        <h2
          id="spl-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          SPL queries prêtes à l'emploi
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold mb-2 text-primary-500">
              Score moyen par framework
            </h3>
            <CopyableSnippet code={SPL_SCORE} label="SPL score" />
          </div>
          <div>
            <h3 className="font-bold mb-2 text-primary-500">
              Contrôles non-conformes
            </h3>
            <CopyableSnippet
              code={SPL_NON_COMPLIANT}
              label="SPL non-compliant"
            />
          </div>
          <div>
            <h3 className="font-bold mb-2 text-primary-500">
              Alerte sur sévérité haute
            </h3>
            <CopyableSnippet code={SPL_ALERT} label="SPL alert" />
          </div>
        </div>
      </section>

      {/* 4. Champs CIM */}
      <section aria-labelledby="cim-title" className="mb-10">
        <h2
          id="cim-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Champs CIM exposés
        </h2>
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Champs Splunk CIM v1 exposés par Humanix pour les preuves de
              conformité
            </caption>
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 text-left">
                <th scope="col" className="p-3 font-bold">
                  Champ
                </th>
                <th scope="col" className="p-3 font-bold">
                  Type
                </th>
                <th scope="col" className="p-3 font-bold">
                  Exemple
                </th>
              </tr>
            </thead>
            <tbody>
              <Row name="action" type="string" example="evidence_exported" />
              <Row
                name="severity"
                type="string"
                example="informational | low | high"
              />
              <Row name="severity_id" type="number" example="1 | 4 | 7" />
              <Row
                name="signature"
                type="string"
                example="humanix.a.6.3.compliant"
              />
              <Row name="signature_id" type="string" example="A.6.3" />
              <Row name="tenant_id" type="string" example="acme-corp" />
              <Row name="framework" type="string" example="ISO27001:2022" />
              <Row name="control_ref" type="string" example="A.6.3" />
              <Row
                name="compliance_status"
                type="string"
                example="compliant | partial | non_compliant"
              />
              <Row name="compliance_score" type="number" example="0.87" />
            </tbody>
          </table>
        </div>
      </section>

      <section className="card text-center bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <h2 className="text-2xl font-extrabold mb-2">
          Prêt à brancher Splunk ?
        </h2>
        <p className="opacity-90 mb-5">
          Dashboard maturité humaine + alerting compliance dès le 1er run du
          connecteur.
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

function Row({
  name,
  type,
  example,
}: {
  name: string;
  type: string;
  example: string;
}) {
  return (
    <tr className="border-t border-gray-100 dark:border-slate-700">
      <td className="p-3 font-mono text-xs">{name}</td>
      <td className="p-3 text-xs text-accent-500">{type}</td>
      <td className="p-3 text-xs text-gray-600 dark:text-gray-300">
        {example}
      </td>
    </tr>
  );
}
