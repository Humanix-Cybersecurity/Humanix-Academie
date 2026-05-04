// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique Mailinblack / Vade. A11y RGAA AA + UI/UX différenciante.

import Link from "next/link";

export const metadata = {
  title: "Connecteur Mailinblack / Vade — Humanix Académie",
  description:
    "Mail bloqué par Mailinblack ou Vade → campagne Humanix ciblée pour les destinataires concernés. Boucle anti-phishing souveraine 🇫🇷.",
};

export default function AntiPhishingIntegrationPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Intégration · Anti-phishing souverain 🇫🇷
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Mailinblack & Vade ·{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            détection × formation
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Quand votre solution anti-phishing française (Mailinblack ou Vade
          Secure) bloque un mail, Humanix forme automatiquement les
          destinataires concernés sur la technique exacte utilisée par
          l'attaquant.
        </p>
      </header>

      <section
        aria-labelledby="logic-title"
        className="card mb-12 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700"
      >
        <h2
          id="logic-title"
          className="text-xl font-extrabold text-primary-500 mb-3"
        >
          Le scénario type
        </h2>
        <ol className="space-y-3 text-sm">
          <li>
            <strong>10:32</strong> — un mail "Service RH urgent" arrive dans la
            boîte de 12 collaborateurs.
          </li>
          <li>
            <strong>10:32</strong> — Mailinblack/Vade détecte le phishing et le
            bloque.
          </li>
          <li>
            <strong>10:33</strong> — webhook sortant → bridge Humanix → API.
          </li>
          <li>
            <strong>10:35</strong> — les 12 collaborateurs reçoivent une
            notification Humanix les invitant à compléter un module de 3 minutes
            sur "le faux mail RH".
          </li>
          <li>
            <strong>Mois suivant</strong> — leur taux de signalement passe de 30
            % à 75 % sur ce type d'attaque.
          </li>
        </ol>
      </section>

      <section aria-labelledby="setup-title" className="mb-10">
        <h2
          id="setup-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Setup
        </h2>
        <ol className="space-y-3 text-sm list-decimal list-inside">
          <li>
            Déployez le bridge Humanix (Python MIT) sur un serveur exposé en
            HTTPS, par exemple{" "}
            <code>https://humanix-antiphishing.exemple.fr</code>.
          </li>
          <li>
            <strong>Mailinblack</strong> → Console admin → Webhooks → URL :{" "}
            <code>/webhook/mailinblack</code>, événement :{" "}
            <code>phishing.detected</code>.
          </li>
          <li>
            <strong>Vade Secure for M365</strong> → Webhook Configuration →
            Endpoint : <code>/webhook/vade</code>, type :{" "}
            <code>ThreatDetection</code>.
          </li>
          <li>
            Humanix →{" "}
            <Link href="/admin/api-keys" className="font-bold underline">
              générer une clé API
            </Link>{" "}
            (Essentielle+).
          </li>
        </ol>
      </section>

      <section aria-labelledby="why-title" className="mb-10">
        <h2
          id="why-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Pourquoi c'est puissant
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>Apprentissage ultra-contextualisé</strong> : on forme les
            utilisateurs sur les techniques que les attaquants utilisent{" "}
            <em>contre eux</em>, pas en théorie générique.
          </li>
          <li>
            <strong>Cycle court</strong> : moins de 5 minutes entre la détection
            et la formation.
          </li>
          <li>
            <strong>Aucun PII brut transmis</strong> : seuls les <em>logins</em>{" "}
            sont passés à Humanix, pas les contenus de mail.
          </li>
          <li>
            <strong>100 % souverain</strong> : Mailinblack (Marseille), Vade
            (Hem), Humanix (Alès) — toute la chaîne est française.
          </li>
        </ul>
      </section>

      <section className="card text-center bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <h2 className="text-2xl font-extrabold mb-2">
          L'anti-phishing FR enseigne, Humanix forme 🇫🇷
        </h2>
        <p className="opacity-90 mb-5">
          Cycle court attaque → formation. Le seul outil de sensibilisation FR
          qui ferme cette boucle.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/integrations"
            className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
          >
            Tous les connecteurs
          </Link>
        </div>
      </section>
    </div>
  );
}
