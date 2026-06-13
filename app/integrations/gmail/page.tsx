// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique d'installation de l'add-on Gmail HumaniX.
// Vise les administrateurs Google Workspace qui veulent deployer le bouton
// "Signaler un phishing" a tous leurs collaborateurs.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Add-on Gmail - Signaler un phishing en 1 clic | HumaniX Académie",
  description:
    "Déployez le bouton « Signaler un phishing » dans Gmail pour tous vos collaborateurs. Google Workspace Add-on, RGPD-compliant, hébergement France.",
  alternates: { canonical: "/integrations/gmail" },
};

export default function GmailIntegrationPage() {
  return (
    <div className="bg-gradient-to-b from-primary-500/5 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <header className="text-center mb-12">
          <p className="inline-block text-xs font-bold uppercase tracking-wider text-accent-500 bg-accent-50 dark:bg-accent-900/20 px-3 py-1 rounded-full mb-4">
            🔌 Add-on Gmail officiel
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            Bouton « Signaler un phishing » dans Gmail
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto">
            Vos collaborateurs signalent un mail suspect en 1 clic depuis Gmail.
            Vous recevez l'alerte en temps réel, l'employé gagne des points sur
            HumaniX. Compatible Gmail Web et mobile (Google Workspace).
          </p>
        </header>

        {/* Note technique : différence avec Outlook */}
        <section className="rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 text-white p-8 mb-12">
          <h2 className="text-2xl font-bold mb-2">Comment c'est livré</h2>
          <p className="opacity-90 text-sm leading-relaxed">
            Un add-on Gmail est un <strong>Google Workspace Add-on</strong> qui
            s'exécute dans Google Apps Script (côté Google) — il n'y a donc rien
            à héberger chez HumaniX. Le code source (manifest + script) est
            fourni dans le dépôt, dossier{" "}
            <code className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
              gmail-addon/
            </code>
            . Vous le déployez dans votre propre tenant Google Workspace en
            quelques minutes.
          </p>
          <a
            href="https://github.com/Humanix-Cybersecurity/Humanix-Academie/tree/main/gmail-addon"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-xl bg-white text-primary-500 font-bold hover:bg-gray-100 transition"
          >
            ⬇ Voir le code de l'add-on (gmail-addon/)
          </a>
        </section>

        {/* Étapes d'installation */}
        <section aria-labelledby="install-title" className="mb-12">
          <h2
            id="install-title"
            className="text-2xl font-bold text-primary-500 dark:text-accent-300 mb-6"
          >
            2 façons de l'installer
          </h2>

          <div className="space-y-6">
            {/* Option A */}
            <article className="card">
              <h3 className="text-xl font-bold text-primary-500 dark:text-accent-300 mb-2">
                ✅ Option A - Déploiement organisation (recommandé)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Pour déployer à toute l'organisation. Aucune action requise des
                utilisateurs.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-200">
                <li>
                  Créez un projet sur{" "}
                  <a
                    href="https://script.google.com"
                    target="_blank"
                    rel="noopener"
                    className="text-accent-500 hover:underline"
                  >
                    Google Apps Script
                  </a>{" "}
                  et collez-y{" "}
                  <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">
                    Code.gs
                  </code>{" "}
                  et{" "}
                  <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">
                    appsscript.json
                  </code>
                  .
                </li>
                <li>
                  Associez-le à un projet Google Cloud, puis activez le{" "}
                  <strong>Google Workspace Marketplace SDK</strong>.
                </li>
                <li>
                  Publiez l'add-on en <strong>diffusion interne</strong> (privée
                  à votre domaine).
                </li>
                <li>
                  Dans la <strong>console d'admin Google</strong> → Apps →
                  Marketplace, installez l'add-on pour toute l'organisation ou
                  une unité organisationnelle ciblée.
                </li>
              </ol>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
                💡 Documentation Google :{" "}
                <a
                  href="https://developers.google.com/workspace/add-ons/gmail"
                  target="_blank"
                  rel="noopener"
                  className="hover:underline"
                >
                  Déployer un add-on Gmail
                </a>
              </p>
            </article>

            {/* Option B */}
            <article className="card">
              <h3 className="text-xl font-bold text-primary-500 dark:text-accent-300 mb-2">
                🧪 Option B - Test individuel
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Pour tester sans déployer à toute l'organisation. 5 minutes.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-200">
                <li>
                  Ouvrez{" "}
                  <a
                    href="https://script.google.com"
                    target="_blank"
                    rel="noopener"
                    className="text-accent-500 hover:underline"
                  >
                    script.google.com
                  </a>{" "}
                  → <strong>Nouveau projet</strong>.
                </li>
                <li>
                  Collez le contenu de <code>Code.gs</code>, puis affichez et
                  remplissez <code>appsscript.json</code> (Paramètres du projet
                  → afficher le manifeste).
                </li>
                <li>
                  Adaptez la constante <code>HUMANIX_BASE_URL</code> si vous êtes
                  en self-host.
                </li>
                <li>
                  <strong>Déployer</strong> → <strong>Tester les déploiements</strong>{" "}
                  → type <strong>Module complémentaire Google Workspace</strong>{" "}
                  → <strong>Installer</strong>.
                </li>
                <li>
                  Ouvrez Gmail puis un email : le volet HumaniX et le bouton
                  « Signaler comme phishing » apparaissent à droite.
                </li>
              </ol>
            </article>
          </div>
        </section>

        {/* Comment ça marche */}
        <section aria-labelledby="how-title" className="mb-12">
          <h2
            id="how-title"
            className="text-2xl font-bold text-primary-500 dark:text-accent-300 mb-6"
          >
            Comment ça marche ?
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Step
              n={1}
              title="L'employé clique"
              text="Sur un mail suspect, il clique sur « Signaler comme phishing » dans le volet Gmail."
            />
            <Step
              n={2}
              title="Le mail est analysé"
              text="Métadonnées envoyées à HumaniX (expéditeur, sujet, longueur). Pas de stockage du contenu."
            />
            <Step
              n={3}
              title="Vous êtes notifié"
              text="Webhook Slack/Teams + dashboard Live Attack Map. L'employé gagne des coins."
            />
          </div>
        </section>

        {/* Sécurité */}
        <section aria-labelledby="security-title" className="mb-12">
          <h2
            id="security-title"
            className="text-2xl font-bold text-primary-500 dark:text-accent-300 mb-4"
          >
            🔒 Sécurité &amp; RGPD
          </h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <li>
              <strong>Exécution côté Google</strong> : l'add-on tourne dans
              Apps Script, aucun secret ni clé API n'est stocké.
            </li>
            <li>
              <strong>Authentification par email pro</strong> : l'utilisateur
              doit exister et être actif sur HumaniX, sinon le signalement est
              refusé.
            </li>
            <li>
              <strong>Minimisation RGPD</strong> : seules les métadonnées
              (expéditeur, sujet, longueur) sont enregistrées. Le contenu n'est
              jamais persisté.
            </li>
            <li>
              <strong>Rate limit anti-abus</strong> : 30 signalements/heure par
              utilisateur.
            </li>
            <li>
              <strong>Audit complet</strong> : chaque signalement est journalisé
              (RGPD art. 32). Hébergement France.
            </li>
          </ul>
        </section>

        {/* CTA final */}
        <section className="text-center p-8 rounded-2xl bg-gray-50 dark:bg-slate-800">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Vous utilisez Microsoft 365 ?{" "}
            <Link
              href="/integrations/outlook"
              className="text-accent-500 hover:underline font-medium"
            >
              Voir l'add-in Outlook
            </Link>
            . Besoin d'aide pour déployer ?
          </p>
          <Link
            href="mailto:contact@humanix-cybersecurity.fr?subject=Aide%20d%C3%A9ploiement%20add-on%20Gmail"
            className="btn-primary text-sm"
          >
            💬 Nous contacter
          </Link>
        </section>
      </div>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="card text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent-500 text-white font-bold mb-3">
        {n}
      </div>
      <h3 className="font-bold text-primary-500 dark:text-accent-300 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{text}</p>
    </div>
  );
}
