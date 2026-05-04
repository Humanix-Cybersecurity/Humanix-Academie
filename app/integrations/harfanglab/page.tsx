// Page publique HarfangLab. A11y RGAA AA + UI/UX différenciante.

import Link from "next/link";

export const metadata = {
  title: "Connecteur HarfangLab — Humanix Académie",
  description:
    "Bridge bidirectionnel HarfangLab (EDR souverain 🇫🇷) ↔ Humanix Académie. Corrélation EDR/sensibilisation + ciblage automatique de campagnes.",
};

export default function HarfangLabIntegrationPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Intégration · EDR souverain 🇫🇷
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          HarfangLab ·{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            la boucle vertueuse cyber
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Votre EDR détecte → Humanix forme → le risque résiduel diminue → l'EDR
          détecte moins → vos collaborateurs sont vraiment protégés.
        </p>
      </header>

      <section aria-labelledby="loop-title" className="mb-10">
        <h2
          id="loop-title"
          className="text-2xl font-extrabold text-primary-500 mb-4"
        >
          La boucle EDR ↔ sensibilisation
        </h2>

        <svg
          viewBox="0 0 700 320"
          className="w-full max-w-3xl mx-auto"
          role="img"
          aria-label="Boucle vertueuse : HarfangLab détecte une alerte sur un user, le bridge déclenche une campagne Humanix ciblée, le user se forme, le score de risque baisse, l'EDR détecte moins."
        >
          <defs>
            <linearGradient id="gh-fr" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B3D91" />
              <stop offset="100%" stopColor="#00A3A1" />
            </linearGradient>
            <marker
              id="arrowH"
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

          <circle cx="170" cy="80" r="55" fill="url(#gh-fr)" />
          <text
            x="170"
            y="78"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            HarfangLab
          </text>
          <text
            x="170"
            y="95"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            opacity="0.85"
          >
            détecte
          </text>

          <circle cx="530" cy="80" r="55" fill="url(#gh-fr)" />
          <text
            x="530"
            y="78"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            Humanix
          </text>
          <text
            x="530"
            y="95"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            opacity="0.85"
          >
            forme cible
          </text>

          <circle cx="170" cy="240" r="55" fill="url(#gh-fr)" />
          <text
            x="170"
            y="238"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            Risque
          </text>
          <text
            x="170"
            y="255"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            opacity="0.85"
          >
            diminue
          </text>

          <circle cx="530" cy="240" r="55" fill="url(#gh-fr)" />
          <text
            x="530"
            y="238"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            User
          </text>
          <text
            x="530"
            y="255"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            opacity="0.85"
          >
            apprend
          </text>

          <line
            x1="225"
            y1="80"
            x2="475"
            y2="80"
            stroke="#00A3A1"
            strokeWidth="2.5"
            markerEnd="url(#arrowH)"
          />
          <line
            x1="530"
            y1="135"
            x2="530"
            y2="185"
            stroke="#00A3A1"
            strokeWidth="2.5"
            markerEnd="url(#arrowH)"
          />
          <line
            x1="475"
            y1="240"
            x2="225"
            y2="240"
            stroke="#00A3A1"
            strokeWidth="2.5"
            markerEnd="url(#arrowH)"
          />
          <line
            x1="170"
            y1="185"
            x2="170"
            y2="135"
            stroke="#00A3A1"
            strokeWidth="2.5"
            markerEnd="url(#arrowH)"
          />

          <text
            x="350"
            y="68"
            textAnchor="middle"
            fontSize="11"
            fill="#555"
            fontWeight="700"
          >
            alertes EDR
          </text>
          <text
            x="556"
            y="165"
            textAnchor="middle"
            fontSize="11"
            fill="#555"
            fontWeight="700"
          >
            campagne
          </text>
          <text
            x="350"
            y="228"
            textAnchor="middle"
            fontSize="11"
            fill="#555"
            fontWeight="700"
          >
            moins de risques
          </text>
          <text
            x="148"
            y="165"
            textAnchor="middle"
            fontSize="11"
            fill="#555"
            fontWeight="700"
          >
            moins de bruit
          </text>
        </svg>
      </section>

      <section aria-labelledby="setup-title" className="mb-10">
        <h2
          id="setup-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Deux sens à configurer
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <article className="card">
            <h3 className="font-bold text-primary-500 mb-2">
              <span aria-hidden="true">→ </span>Push (preuves Humanix)
            </h3>
            <pre className="text-xs bg-slate-900 dark:bg-black text-slate-100 p-3 rounded-lg overflow-x-auto">
              <code>
                python humanix_harfanglab_connector.py push --framework NIS2
              </code>
            </pre>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              Pousse les preuves CEF dans le syslog HarfangLab (1×/jour).
            </p>
          </article>
          <article className="card">
            <h3 className="font-bold text-primary-500 mb-2">
              <span aria-hidden="true">← </span>Pull (alertes EDR)
            </h3>
            <pre className="text-xs bg-slate-900 dark:bg-black text-slate-100 p-3 rounded-lg overflow-x-auto">
              <code>python humanix_harfanglab_connector.py pull --hours 4</code>
            </pre>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              Récupère les alertes des 4 dernières heures et déclenche des
              campagnes Humanix ciblées (recommandé : toutes les 4h).
            </p>
          </article>
        </div>
      </section>

      <section className="card text-center bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <h2 className="text-2xl font-extrabold mb-2">
          EDR + Sensibilisation : la combinaison souveraine 🇫🇷
        </h2>
        <p className="opacity-90 mb-5">
          Le seul connecteur natif qui transforme une alerte EDR en module de
          sensibilisation ciblée, sans intervention humaine.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/integrations/webhooks"
            className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
          >
            Doc webhooks
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
