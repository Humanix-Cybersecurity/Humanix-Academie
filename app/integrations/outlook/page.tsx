// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique d'installation du plugin Outlook HumaniX.
// Vise les administrateurs Microsoft 365 qui veulent deployer le bouton
// "Signaler un phishing" a tous leurs collaborateurs.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Plugin Outlook — Signaler un phishing en 1 clic | HumaniX Académie",
  description:
    "Déployez en 5 minutes le bouton « Signaler un phishing » dans Outlook pour tous vos collaborateurs. Compatible Outlook Web, Desktop, Mobile. Gratuit, RGPD-compliant.",
  alternates: { canonical: "/integrations/outlook" },
};

export default function OutlookIntegrationPage() {
  return (
    <div className="bg-gradient-to-b from-primary-500/5 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <header className="text-center mb-12">
          <p className="inline-block text-xs font-bold uppercase tracking-wider text-accent-500 bg-accent-50 dark:bg-accent-900/20 px-3 py-1 rounded-full mb-4">
            🔌 Plugin Outlook officiel
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            Bouton « Signaler un phishing » dans Outlook
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto">
            Vos collaborateurs signalent un mail suspect en 1 clic depuis
            Outlook. Vous recevez l'alerte en temps réel, l'employé gagne des
            points sur HumaniX. Compatible Outlook Web, Desktop, Mobile.
          </p>
        </header>

        {/* CTA principal */}
        <section className="rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 text-white p-8 mb-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Téléchargez le manifest</h2>
          <p className="opacity-90 mb-6 text-sm">
            Le fichier XML pré-configuré avec le domaine de votre instance
            HumaniX.
          </p>
          <a
            href="/api/integrations/outlook/manifest.xml"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-primary-500 font-bold hover:bg-gray-100 transition"
            download="humanix-outlook-manifest.xml"
          >
            ⬇ Télécharger humanix-outlook-manifest.xml
          </a>
        </section>

        {/* Étapes d'installation */}
        <section aria-labelledby="install-title" className="mb-12">
          <h2
            id="install-title"
            className="text-2xl font-bold text-primary-500 dark:text-accent-300 mb-6"
          >
            3 façons de l'installer
          </h2>

          <div className="space-y-6">
            {/* Option A */}
            <article className="card">
              <h3 className="text-xl font-bold text-primary-500 dark:text-accent-300 mb-2">
                ✅ Option A — Déploiement entreprise (recommandé)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Pour déployer à toute l'entreprise en 5 minutes. Aucune action
                requise des utilisateurs.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-200">
                <li>
                  Connectez-vous au{" "}
                  <a
                    href="https://admin.microsoft.com"
                    target="_blank"
                    rel="noopener"
                    className="text-accent-500 hover:underline"
                  >
                    Microsoft 365 Admin Center
                  </a>{" "}
                  avec un compte admin global.
                </li>
                <li>
                  Menu : <strong>Paramètres</strong> →{" "}
                  <strong>Applications intégrées</strong> →{" "}
                  <strong>Charger des applications personnalisées</strong>.
                </li>
                <li>
                  Choisissez <strong>Office Add-in</strong>, puis{" "}
                  <strong>Charger le manifeste</strong>.
                </li>
                <li>
                  Sélectionnez le fichier{" "}
                  <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">
                    humanix-outlook-manifest.xml
                  </code>{" "}
                  téléchargé ci-dessus.
                </li>
                <li>
                  Choisissez les utilisateurs cibles (toute l'entreprise, un
                  groupe, ou des utilisateurs individuels).
                </li>
                <li>
                  Validez. Le bouton apparaît dans Outlook sous 12-24h pour les
                  utilisateurs concernés.
                </li>
              </ol>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
                💡 Documentation Microsoft :{" "}
                <a
                  href="https://learn.microsoft.com/microsoft-365/admin/manage/test-and-deploy-microsoft-365-apps"
                  target="_blank"
                  rel="noopener"
                  className="hover:underline"
                >
                  Déployer un Add-in Office
                </a>
              </p>
            </article>

            {/* Option B */}
            <article className="card">
              <h3 className="text-xl font-bold text-primary-500 dark:text-accent-300 mb-2">
                🧪 Option B — Test individuel (Outlook Web)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Pour tester sans déployer à toute l'entreprise. 2 minutes.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-200">
                <li>
                  Ouvrez{" "}
                  <a
                    href="https://outlook.office.com"
                    target="_blank"
                    rel="noopener"
                    className="text-accent-500 hover:underline"
                  >
                    Outlook Web
                  </a>
                  .
                </li>
                <li>
                  Cliquez sur l'icône <strong>Paramètres</strong> (⚙) en haut à
                  droite.
                </li>
                <li>
                  Allez dans <strong>Général</strong> →{" "}
                  <strong>Mes compléments</strong>.
                </li>
                <li>
                  Cliquez sur <strong>Personnalisé</strong> →{" "}
                  <strong>Ajouter un complément personnalisé</strong> →{" "}
                  <strong>À partir d'un fichier</strong>.
                </li>
                <li>Sélectionnez le manifest téléchargé. Confirmez.</li>
                <li>
                  Ouvrez n'importe quel email : le bouton{" "}
                  <strong>« Signaler à HumaniX »</strong> apparaît dans le
                  ruban.
                </li>
              </ol>
            </article>

            {/* Option C */}
            <article className="card">
              <h3 className="text-xl font-bold text-primary-500 dark:text-accent-300 mb-2">
                💻 Option C — Outlook Desktop (Windows)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Pour les développeurs ou tests avancés.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-200">
                <li>
                  Activez le mode développeur via{" "}
                  <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">
                    regedit
                  </code>{" "}
                  :
                  <pre className="mt-2 bg-gray-100 dark:bg-slate-800 p-3 rounded text-xs overflow-x-auto">
                    HKCU\Software\Microsoft\Office\16.0\WEF\Developer
                  </pre>
                </li>
                <li>
                  Créez la clé <code>OfficeAddins</code> et pointez vers le
                  fichier manifest local.
                </li>
                <li>
                  Redémarrez Outlook Desktop. Le bouton apparaît dans le ruban.
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
              text="Sur un mail suspect, il clique sur « Signaler à HumaniX » dans le ruban Outlook."
            />
            <Step
              n={2}
              title="Le mail est analysé"
              text="Métadonnées envoyées à HumaniX (expéditeur, sujet, longueur). Pas de stockage du contenu."
            />
            <Step
              n={3}
              title="Vous êtes notifié"
              text="Webhook Slack/Teams + dashboard Live Attack Map. L'employé gagne +5 coins."
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
              <strong>CORS strict</strong> : seules les origines Outlook
              officielles (outlook.office.com, outlook.office365.com,
              outlook.live.com) peuvent appeler l'API.
            </li>
            <li>
              <strong>Minimisation RGPD</strong> : seules les métadonnées du
              mail sont enregistrées (expéditeur, sujet, longueur). Le contenu
              n'est jamais persisté.
            </li>
            <li>
              <strong>Rate limit anti-abus</strong> : 30 signalements/heure par
              utilisateur.
            </li>
            <li>
              <strong>Pas de partage tiers</strong> : les signalements restent
              dans votre instance HumaniX (hébergement France).
            </li>
            <li>
              <strong>Audit complet</strong> : chaque signalement est journalisé
              dans la table Event (RGPD art. 32).
            </li>
          </ul>
        </section>

        {/* CTA final */}
        <section className="text-center p-8 rounded-2xl bg-gray-50 dark:bg-slate-800">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Besoin d'aide pour déployer chez vous ?
          </p>
          <Link
            href="mailto:contact@humanix-cybersecurity.fr?subject=Aide%20d%C3%A9ploiement%20plugin%20Outlook"
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
