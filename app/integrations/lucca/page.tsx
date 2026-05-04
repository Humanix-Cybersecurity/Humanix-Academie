// Page publique Lucca. A11y RGAA AA + UI/UX différenciante.

import Link from "next/link";
import CopyableSnippet from "@/components/CopyableSnippet";

export const metadata = {
  title: "Connecteur Lucca — Humanix Académie",
  description:
    "Synchronisation HR auto : nouveau collaborateur dans Lucca → compte Humanix créé + onboarding cyber poussé. Connecteur Python souverain 🇫🇷.",
};

const CRON_SNIPPET = `# Toutes les heures, sync Lucca → Humanix
0 * * * * cd /opt/humanix-lucca && set -a && . ./.env && set +a \\
  && python humanix_lucca_connector.py >> /var/log/humanix-lucca.log 2>&1`;

export default function LuccaIntegrationPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Intégration · HR souverain 🇫🇷
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Lucca ·{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            zéro création manuelle
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Le mouvement HR de votre Lucca pilote automatiquement la vie cyber de
          vos collaborateurs dans Humanix : compte créé à l'embauche, onboarding
          poussé, soft-delete au départ. 100 % souverain, 100 % automatique.
        </p>
      </header>

      {/* Ce qui se passe */}
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
        <ol className="space-y-3 text-sm">
          <li>
            <strong>1. Lucca</strong> — un nouveau collaborateur est créé par RH
            (ou import via API).
          </li>
          <li>
            <strong>2. Connecteur Humanix</strong> — déclenché en cron horaire,
            pull les nouveaux users via <code>/api/v3/users</code>.
          </li>
          <li>
            <strong>3. SCIM v2 Humanix</strong> — POST /scim/v2/Users → compte
            créé avec <code>role=LEARNER</code> et{" "}
            <code>service=&lt;département Lucca&gt;</code>.
          </li>
          <li>
            <strong>4. Magic link</strong> — Humanix envoie automatiquement le
            lien d'accès au collaborateur, avec module onboarding cyber
            prioritaire.
          </li>
          <li>
            <strong>5. Au départ</strong> — Lucca passe le user en{" "}
            <code>isActive=false</code>, le connecteur le détecte, soft-delete
            côté Humanix (historique conservé pour audit).
          </li>
        </ol>
      </section>

      {/* Setup */}
      <section aria-labelledby="setup-title" className="mb-10">
        <h2
          id="setup-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Setup en 5 minutes
        </h2>
        <ol className="space-y-3 text-sm list-decimal list-inside">
          <li>
            Lucca → <strong>Settings → API</strong> → générer une clé
            application avec scope lecture utilisateurs.
          </li>
          <li>
            Humanix →{" "}
            <Link href="/admin/api-keys" className="font-bold underline">
              générer une clé API
            </Link>{" "}
            (plan Essentielle ou supérieur).
          </li>
          <li>
            Cloner{" "}
            <a
              href="https://github.com/humanix-cybersecurity/humanix-lucca-connector"
              className="font-bold underline"
            >
              le connecteur Python
            </a>{" "}
            (MIT). Renseigner <code>LUCCA_BASE_URL</code>,{" "}
            <code>LUCCA_API_KEY</code>, <code>HUMANIX_API_KEY</code>.
          </li>
          <li>
            Tester : <code>python humanix_lucca_connector.py --dry-run</code>
          </li>
          <li>Activer en cron (1×/h recommandé) :</li>
        </ol>
        <div className="mt-4">
          <CopyableSnippet code={CRON_SNIPPET} label="cron Lucca" />
        </div>
      </section>

      {/* Mapping */}
      <section aria-labelledby="mapping-title" className="mb-10">
        <h2
          id="mapping-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Mapping des champs
        </h2>
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Mapping des attributs Lucca vers les champs Humanix
            </caption>
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 text-left">
                <th scope="col" className="p-3 font-bold">
                  Champ Lucca
                </th>
                <th scope="col" className="p-3 font-bold">
                  Champ Humanix
                </th>
                <th scope="col" className="p-3 font-bold">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              <Row
                lucca="mail"
                humanix="userName + email primaire"
                notes="Identifiant unique côté Humanix"
              />
              <Row
                lucca="firstName + lastName"
                humanix="displayName + name"
                notes="Mis à jour à chaque sync"
              />
              <Row
                lucca="department.name"
                humanix="service (extension Humanix)"
                notes="Mappe automatiquement sur Group SCIM"
              />
              <Row
                lucca="isActive"
                humanix="active"
                notes="false = soft-delete (historique conservé)"
              />
              <Row
                lucca="(par défaut)"
                humanix="role = LEARNER"
                notes="Élévation manuelle ADMIN/MANAGER côté Humanix"
              />
            </tbody>
          </table>
        </div>
      </section>

      <section className="card text-center bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <h2 className="text-2xl font-extrabold mb-2">
          100 % souverain, 100 % automatique 🇫🇷
        </h2>
        <p className="opacity-90 mb-5">
          Votre stack RH française parle à votre stack cyber française. Sans
          intermédiaire US.
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
  lucca,
  humanix,
  notes,
}: {
  lucca: string;
  humanix: string;
  notes: string;
}) {
  return (
    <tr className="border-t border-gray-100 dark:border-slate-700">
      <td className="p-3 font-mono text-xs">{lucca}</td>
      <td className="p-3 text-xs text-accent-500">{humanix}</td>
      <td className="p-3 text-xs text-gray-600 dark:text-gray-300">{notes}</td>
    </tr>
  );
}
