// Page publique Sekoia.io. A11y RGAA AA + UI/UX différenciante.

import Link from "next/link";
import CopyableSnippet from "@/components/CopyableSnippet";

export const metadata = {
  title: "Connecteur Sekoia.io — Humanix Académie",
  description:
    "Poussez les preuves de conformité Humanix vers Sekoia.io (SIEM/XDR souverain 🇫🇷) au format CEF. Connecteur Python MIT.",
};

const CRON = `0 6 * * * cd /opt/humanix-sekoia && set -a && . ./.env && set +a \\
  && python humanix_sekoia_connector.py --framework NIS2 \\
  >> /var/log/humanix-sekoia.log 2>&1`;

export default function SekoiaIntegrationPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Intégration · SIEM/XDR souverain 🇫🇷
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Sekoia.io ·{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            stack 100 % souveraine
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Vos preuves de sensibilisation atterrissent dans votre Operations
          Center Sekoia. Corrélez le facteur humain (taux de complétion,
          signalements phishing) avec vos alertes EDR/réseau dans un seul outil
          souverain.
        </p>
      </header>

      <section
        aria-labelledby="setup-title"
        className="card mb-10 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700"
      >
        <h2
          id="setup-title"
          className="text-xl font-extrabold text-primary-500 mb-3"
        >
          Setup en 3 étapes
        </h2>
        <ol className="space-y-3 text-sm list-decimal list-inside">
          <li>
            Sekoia → <strong>Operations Center → Intakes → Add Intake</strong> →
            format <strong>ArcSight CEF</strong> (parser générique). Récupérez
            l'<strong>Intake Key</strong>.
          </li>
          <li>
            Humanix →{" "}
            <Link href="/admin/api-keys" className="font-bold underline">
              générer une clé API
            </Link>{" "}
            (Essentielle+).
          </li>
          <li>Cron quotidien :</li>
        </ol>
        <div className="mt-4">
          <CopyableSnippet code={CRON} label="cron Sekoia" />
        </div>
      </section>

      <section aria-labelledby="usecases-title" className="mb-10">
        <h2
          id="usecases-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Cas d'usage Sekoia côté SOC
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <article className="card">
            <h3 className="font-bold text-primary-500 mb-2">
              Dashboard maturité humaine
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Visualisez en live l'évolution du score Humanix par tenant
              directement dans Sekoia, à côté de vos métriques EDR.
            </p>
          </article>
          <article className="card">
            <h3 className="font-bold text-primary-500 mb-2">
              Règle de corrélation enrichie
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Si un user déclenche une alerte EDR <strong>et</strong> son score
              Humanix est inférieur à 50 % → priorité d'alerte automatique.
            </p>
          </article>
          <article className="card">
            <h3 className="font-bold text-primary-500 mb-2">
              Audit NIS2 / ANSSI
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Toutes les preuves Humanix sont historisées dans Sekoia, avec les
              événements de signalement phishing — preuve directe pour audit.
            </p>
          </article>
          <article className="card">
            <h3 className="font-bold text-primary-500 mb-2">
              Co-marketing souverain
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Première intégration sensibilisation cyber du marketplace Sekoia.
              Visible dans leur catalogue de connecteurs (PR communautaire à
              venir).
            </p>
          </article>
        </div>
      </section>

      <section className="card text-center bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <h2 className="text-2xl font-extrabold mb-2">
          SIEM souverain × sensibilisation souveraine 🇫🇷
        </h2>
        <p className="opacity-90 mb-5">
          Aucune dépendance non-UE dans la boucle. Conformité native NIS2 /
          ANSSI.
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
