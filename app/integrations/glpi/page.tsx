// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique GLPI. A11y RGAA AA + UI/UX différenciante.

import Link from "next/link";

export const metadata = {
  title: "Connecteur GLPI - Humanix Académie",
  description:
    "Phishing signalé dans Humanix → ticket GLPI auto sur la file Sécurité. Bridge open-source MIT, 100 % souverain 🇫🇷.",
};

export default function GlpiIntegrationPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Intégration · ITSM souverain 🇫🇷
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          GLPI ·{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            tickets cyber automatiques
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Quand un collaborateur signale un phishing depuis Humanix (Outlook ou
          interne), un ticket GLPI est créé immédiatement sur votre file
          Sécurité. Le SOC ou l'IT prend le relais sans manipulation manuelle.
        </p>
      </header>

      {/* Schema flow */}
      <section
        aria-labelledby="flow-title"
        className="card mb-12 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700"
      >
        <h2
          id="flow-title"
          className="text-xl font-extrabold text-primary-500 text-center mb-4"
        >
          Le flux complet
        </h2>

        <svg
          viewBox="0 0 800 200"
          className="w-full max-w-4xl mx-auto"
          role="img"
          aria-label="Flux : un user signale un phishing dans Humanix, le webhook signé HMAC est envoyé au bridge Python, qui appelle l'API GLPI et crée un ticket sur la file Sécurité."
        >
          <defs>
            <linearGradient id="g-orange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#FACC15" />
            </linearGradient>
            <marker
              id="arrowFR"
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
          <rect x="10" y="70" width="160" height="60" rx="14" fill="#0B3D91" />
          <text
            x="90"
            y="98"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            User
          </text>
          <text
            x="90"
            y="118"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            opacity="0.85"
          >
            signale phishing
          </text>

          <rect x="220" y="70" width="160" height="60" rx="14" fill="#00A3A1" />
          <text
            x="300"
            y="98"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            Humanix
          </text>
          <text
            x="300"
            y="118"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            opacity="0.85"
          >
            webhook HMAC
          </text>

          <rect x="430" y="70" width="160" height="60" rx="14" fill="#7C3AED" />
          <text
            x="510"
            y="98"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            Bridge Python
          </text>
          <text
            x="510"
            y="118"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            opacity="0.85"
          >
            vérifie + transforme
          </text>

          <rect
            x="640"
            y="70"
            width="150"
            height="60"
            rx="14"
            fill="url(#g-orange)"
          />
          <text
            x="715"
            y="98"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            GLPI
          </text>
          <text
            x="715"
            y="118"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            opacity="0.85"
          >
            ticket Sécurité
          </text>

          <line
            x1="175"
            y1="100"
            x2="215"
            y2="100"
            stroke="#00A3A1"
            strokeWidth="2.5"
            markerEnd="url(#arrowFR)"
          />
          <line
            x1="385"
            y1="100"
            x2="425"
            y2="100"
            stroke="#00A3A1"
            strokeWidth="2.5"
            markerEnd="url(#arrowFR)"
          />
          <line
            x1="595"
            y1="100"
            x2="635"
            y2="100"
            stroke="#00A3A1"
            strokeWidth="2.5"
            markerEnd="url(#arrowFR)"
          />

          <text x="400" y="180" textAnchor="middle" fontSize="11" fill="#555">
            Bridge Python (MIT) à déployer chez vous · vérifie HMAC-SHA256 ·
            stateless · sans persistance
          </text>
        </svg>
      </section>

      {/* Mapping events */}
      <section aria-labelledby="mapping-title" className="mb-10">
        <h2
          id="mapping-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Events Humanix → tickets GLPI
        </h2>
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Mapping des events webhook Humanix vers les tickets GLPI
            </caption>
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 text-left">
                <th scope="col" className="p-3 font-bold">
                  Event
                </th>
                <th scope="col" className="p-3 font-bold">
                  Titre du ticket
                </th>
                <th scope="col" className="p-3 font-bold">
                  Urgence GLPI
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100 dark:border-slate-700">
                <td className="p-3 font-mono text-xs">phishing.reported</td>
                <td className="p-3 text-xs">
                  Phishing signalé par &lt;user&gt;
                </td>
                <td className="p-3 text-xs">
                  <span className="text-red-600 font-bold">Haute (2)</span>
                </td>
              </tr>
              <tr className="border-t border-gray-100 dark:border-slate-700">
                <td className="p-3 font-mono text-xs">
                  phishing.campaign_completed
                </td>
                <td className="p-3 text-xs">Campagne phishing terminée</td>
                <td className="p-3 text-xs">
                  <span className="text-amber-600 font-bold">Moyenne (3)</span>
                </td>
              </tr>
              <tr className="border-t border-gray-100 dark:border-slate-700">
                <td className="p-3 font-mono text-xs">evidence.exported</td>
                <td className="p-3 text-xs">Bundle GRC exporté</td>
                <td className="p-3 text-xs">
                  <span className="text-gray-600 font-bold">Basse (4)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Setup */}
      <section aria-labelledby="setup-title" className="mb-10">
        <h2
          id="setup-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Setup en 10 minutes
        </h2>
        <ol className="space-y-3 text-sm list-decimal list-inside">
          <li>
            GLPI → <strong>Setup → General → API</strong> → activer l'API REST.
          </li>
          <li>
            Générer un <strong>App-Token</strong> au niveau global.
          </li>
          <li>
            Créer un user technique GLPI →{" "}
            <strong>Préférences → Tokens d'API</strong> → générer un{" "}
            <strong>User-Token</strong>.
          </li>
          <li>
            Cloner le bridge : <code>git clone humanix-glpi-bridge</code>,
            renseigner <code>.env</code>, lancer{" "}
            <code>python humanix_glpi_bridge.py</code>.
          </li>
          <li>
            Déployer derrière un reverse proxy HTTPS (HAProxy, Nginx, Caddy).
          </li>
          <li>
            Humanix →{" "}
            <Link href="/admin/integrations" className="font-bold underline">
              /admin/integrations
            </Link>{" "}
            → Nouveau webhook Generic → URL{" "}
            <code>https://humanix-bridge.exemple.fr/webhook</code> + secret
            partagé + abonnement events.
          </li>
        </ol>
      </section>

      <section className="card text-center bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <h2 className="text-2xl font-extrabold mb-2">
          100 % open-source, 100 % souverain 🇫🇷
        </h2>
        <p className="opacity-90 mb-5">
          GLPI est l'ITSM le plus déployé en PME française. Humanix s'y branche
          nativement, sans dépendre d'un éditeur tiers.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/integrations/webhooks"
            className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
          >
            Doc webhooks signés
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
