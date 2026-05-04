// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique de documentation des webhooks signés HMAC.
// Cible : développeur RSSI / SOC qui veut intégrer Humanix à son SIEM ou
// son outil interne via webhook.
// A11y RGAA AA : semantic, headings hiérarchiques, focus visible, labels.
// UI/UX différenciante : code samples en 3 langages, vérif HMAC documentée
// pas-à-pas, payload exemple par event.

import Link from "next/link";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";

export const metadata = {
  title: "Webhooks signés HMAC — Humanix Académie",
  description:
    "Recevez les événements Humanix en temps réel sur votre endpoint, signés HMAC-SHA256. Documentation complète + samples de vérification en Node, Python, Go.",
};

const VERIFY_NODE = `import crypto from "node:crypto";

function verifySignature(rawBody, signatureHeader, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  // timingSafeEqual évite les attaques de timing
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signatureHeader, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}`;

const VERIFY_PYTHON = `import hmac, hashlib

def verify_signature(raw_body: bytes, signature_header: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)`;

const VERIFY_GO = `package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

func verifySignature(rawBody []byte, signature, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(rawBody)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}`;

export default function WebhooksDocPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      {/* Hero */}
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Intégration · Push events
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Webhooks signés{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            HMAC-SHA256
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Recevez les événements Humanix en temps réel sur votre endpoint, sans
          polling. Signature cryptographique vérifiable. SSRF-safe. Compatible
          Zapier, n8n, Make, ou votre SIEM custom.
        </p>
      </header>

      {/* Bloc rapide */}
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
        <ol className="space-y-2 list-decimal list-inside">
          <li>
            Créez un webhook depuis{" "}
            <Link href="/admin/integrations" className="font-bold underline">
              /admin/integrations
            </Link>{" "}
            (type : <strong>Generic</strong>).
          </li>
          <li>
            Notez le <code>secret</code> généré et abonnez-vous aux events
            voulus.
          </li>
          <li>
            Recevez vos events POST sur votre URL avec header{" "}
            <code>x-humanix-signature</code>.
          </li>
        </ol>
      </section>

      {/* Format payload */}
      <section aria-labelledby="payload-title" className="mb-10">
        <h2
          id="payload-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Format du payload
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Tous les events sont envoyés en POST JSON. La structure est commune :
        </p>
        <pre className="bg-slate-900 dark:bg-black text-slate-100 p-4 rounded-xl text-xs sm:text-sm overflow-x-auto">
          <code>{`{
  "event": "evidence.exported",
  "tenantId": "demo",
  "occurredAt": "2026-05-03T14:23:45Z",
  "data": {
    /* propre à l'event — voir ci-dessous */
  }
}`}</code>
        </pre>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
          Headers HTTP envoyés :
        </p>
        <ul className="text-sm space-y-1 mt-1">
          <li>
            <code>content-type: application/json</code>
          </li>
          <li>
            <code>x-humanix-event: &lt;event-key&gt;</code>
          </li>
          <li>
            <code>x-humanix-signature: &lt;hex hmac sha256&gt;</code>
          </li>
          <li>
            <code>x-humanix-tenant: &lt;tenant-id&gt;</code>
          </li>
        </ul>
      </section>

      {/* Vérif signature */}
      <section aria-labelledby="verify-title" className="mb-10">
        <h2
          id="verify-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Vérifier la signature HMAC
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          La signature est le HMAC-SHA256 du <strong>body brut</strong> (avant
          parsing JSON) avec votre <code>secret</code>, encodé en hex. Code de
          référence dans 3 langages :
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <CodeBlock title="Node.js" code={VERIFY_NODE} />
          <CodeBlock title="Python" code={VERIFY_PYTHON} />
          <CodeBlock title="Go" code={VERIFY_GO} />
        </div>

        <div
          className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 text-sm"
          role="note"
        >
          <strong>Important sécurité</strong> : utilisez{" "}
          <code>timingSafeEqual</code> / <code>compare_digest</code> /{" "}
          <code>hmac.Equal</code>, jamais <code>===</code>. Une comparaison
          naïve ouvre une faille de timing.
        </div>
      </section>

      {/* Catalogue events */}
      <section aria-labelledby="events-title" className="mb-10">
        <h2
          id="events-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Catalogue des events disponibles
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {Object.keys(WEBHOOK_EVENTS).length} events au total. Vous vous
          abonnez à ceux qui vous intéressent depuis la console admin.
        </p>

        <div className="space-y-3">
          {Object.entries(WEBHOOK_EVENTS).map(([key, def]) => (
            <details key={key} className="card">
              <summary className="cursor-pointer">
                <code className="text-xs bg-primary-50 dark:bg-slate-700 text-primary-600 dark:text-accent-300 px-2 py-1 rounded font-bold mr-2">
                  {key}
                </code>
                <span className="font-semibold">{def.label}</span>
              </summary>
              <div className="mt-3 text-sm">
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  {def.description}
                </p>
                <p className="text-xs uppercase tracking-widest font-bold text-accent-500 mt-3 mb-1">
                  Exemple de payload <code>data</code>
                </p>
                <pre className="bg-slate-900 dark:bg-black text-slate-100 p-3 rounded-lg text-xs overflow-x-auto">
                  <code>{JSON.stringify(def.sample, null, 2)}</code>
                </pre>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Sécurité */}
      <section aria-labelledby="security-title" className="mb-10">
        <h2
          id="security-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Garanties sécurité
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>HTTPS uniquement</strong> : les URLs <code>http://</code>{" "}
            sont rejetées.
          </li>
          <li>
            <strong>SSRF guard</strong> : impossible de pointer vers une IP
            privée (10.x, 172.16/12, 192.168/16, 127.x, 169.254.x) ou un domaine
            interne (<code>*.local</code>, <code>*.internal</code>,{" "}
            <code>localhost</code>).
          </li>
          <li>
            <strong>Timeout strict</strong> : 5 secondes par tentative, le reste
            est annulé.
          </li>
          <li>
            <strong>Payload borné</strong> : 50 KB max, pas de fuite de données
            massive.
          </li>
          <li>
            <strong>Stats par webhook</strong> : succès / échecs / dernière
            erreur visibles dans <code>/admin/integrations</code>.
          </li>
          <li>
            <strong>Rotation du secret</strong> : possible à tout moment, sans
            interruption de service.
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section
        aria-labelledby="cta-title"
        className="card text-center bg-gradient-to-br from-primary-500 to-accent-500 text-white"
      >
        <h2 id="cta-title" className="text-2xl font-extrabold mb-2">
          Prêt à brancher votre SIEM ?
        </h2>
        <p className="opacity-90 mb-5">
          Compatible Splunk HEC, Sentinel Logs Ingestion API, Sekoia.io, Elastic
          Webhooks Ingest, n8n, Zapier, Make.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/admin/integrations"
            className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
          >
            Configurer un webhook
          </Link>
          <Link
            href="/integrations"
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-2xl transition border-2 border-white/30"
          >
            Voir tous les connecteurs
          </Link>
        </div>
      </section>
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="card p-3">
      <p className="text-xs uppercase tracking-widest font-bold text-accent-500 mb-2">
        {title}
      </p>
      <pre className="bg-slate-900 dark:bg-black text-slate-100 p-3 rounded-lg text-xs overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}
