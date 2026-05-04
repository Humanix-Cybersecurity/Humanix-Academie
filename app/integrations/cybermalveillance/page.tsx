// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique CyberMalveillance.gouv.fr.
// A11y RGAA AA + UI/UX différenciante. Cible : RSSI / dirigeant PME qui veut
// savoir comment Humanix s'articule avec le dispositif officiel français.

import Link from "next/link";

export const metadata = {
  title: "Liaison CyberMalveillance.gouv.fr — Humanix Académie",
  description:
    "Humanix s'articule avec le dispositif national CyberMalveillance.gouv.fr : déclaration d'incidents, kit de communication, ressources officielles intégrées.",
};

export default function CybermalveillanceIntegrationPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Dispositif officiel · État français 🇫🇷
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          CyberMalveillance.gouv.fr ·{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            le bon réflexe
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Humanix Académie est en cours de référencement officiel auprès de
          CyberMalveillance.gouv.fr, le dispositif national d'assistance et de
          prévention créé par l'État français. Voici comment vos collaborateurs
          y sont connectés.
        </p>
      </header>

      {/* Bandeau orientation */}
      <section
        aria-labelledby="urgence-title"
        className="card mb-12 bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-900/20 dark:to-amber-900/20 border-l-4 border-red-500"
      >
        <h2
          id="urgence-title"
          className="text-xl font-extrabold text-red-700 dark:text-red-300 mb-2"
        >
          En cas d'incident cyber avéré
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">
          Si vous (ou un de vos collaborateurs) êtes victime d'une attaque
          (rançongiciel, fraude, fuite de données…) :
        </p>
        <ol className="space-y-2 text-sm list-decimal list-inside">
          <li>
            Rendez-vous immédiatement sur{" "}
            <a
              href="https://www.cybermalveillance.gouv.fr/diagnostic"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline text-red-700 dark:text-red-300"
            >
              cybermalveillance.gouv.fr/diagnostic
            </a>
          </li>
          <li>
            Suivez le diagnostic guidé (5 min) — il oriente vers les bons
            réflexes.
          </li>
          <li>
            Si nécessaire, vous êtes mis en relation avec un prestataire
            labellisé <strong>ExpertCyber</strong>.
          </li>
          <li>
            Déposez plainte auprès de la police ou gendarmerie (procédure dans
            le diagnostic).
          </li>
        </ol>
      </section>

      {/* Comment Humanix s'articule */}
      <section aria-labelledby="lien-title" className="mb-10">
        <h2
          id="lien-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Comment Humanix s'articule avec le dispositif
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <article className="card">
            <h3 className="font-bold text-primary-500 mb-2 text-lg">
              <span aria-hidden="true">📚 </span>Ressources intégrées
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Les fiches officielles CyberMalveillance.gouv.fr (rançongiciel,
              phishing, fraude au président, vol de données) sont référencées
              dans la{" "}
              <Link href="/librairie" className="font-bold underline">
                librairie Humanix
              </Link>{" "}
              avec lien direct vers la source officielle. Aucun copier-coller :
              vos collaborateurs apprennent au plus près de la source.
            </p>
          </article>

          <article className="card">
            <h3 className="font-bold text-primary-500 mb-2 text-lg">
              <span aria-hidden="true">🔗 </span>Lien dans la procédure incident
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              La{" "}
              <Link href="/admin/incidents" className="font-bold underline">
                procédure incident
              </Link>{" "}
              du Pack NIS2 fournie aux clients pointe systématiquement vers
              cybermalveillance.gouv.fr/diagnostic comme premier réflexe avant
              toute autre action.
            </p>
          </article>

          <article className="card">
            <h3 className="font-bold text-primary-500 mb-2 text-lg">
              <span aria-hidden="true">📅 </span>Anecdote du lundi
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Notre{" "}
              <Link href="/anecdotes" className="font-bold underline">
                cyber-anecdote du lundi
              </Link>{" "}
              relaie chaque mois une alerte officielle CyberMalveillance auprès
              des dirigeants PME abonnés.
            </p>
          </article>

          <article className="card">
            <h3 className="font-bold text-primary-500 mb-2 text-lg">
              <span aria-hidden="true">🇫🇷 </span>Démarche de référencement
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Humanix-Cybersecurity a déposé un dossier de référencement auprès
              du GIP ACYMA, opérateur de CyberMalveillance.gouv.fr. Statut :
              <strong> en cours d'instruction</strong>. Mise à jour à
              publication.
            </p>
          </article>
        </div>
      </section>

      {/* Contact officiel */}
      <section aria-labelledby="ressources-title" className="mb-10">
        <h2
          id="ressources-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Ressources officielles
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <a
              href="https://www.cybermalveillance.gouv.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-accent-500 hover:underline"
            >
              cybermalveillance.gouv.fr ↗
            </a>{" "}
            — site officiel
          </li>
          <li>
            <a
              href="https://www.cybermalveillance.gouv.fr/diagnostic"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-accent-500 hover:underline"
            >
              Diagnostic guidé ↗
            </a>{" "}
            — premier réflexe en cas d'incident
          </li>
          <li>
            <a
              href="https://www.cybermalveillance.gouv.fr/tous-nos-contenus"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-accent-500 hover:underline"
            >
              Bibliothèque officielle ↗
            </a>{" "}
            — fiches gratuites par thème
          </li>
          <li>
            <a
              href="https://www.cybermalveillance.gouv.fr/expertcyber"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-accent-500 hover:underline"
            >
              Label ExpertCyber ↗
            </a>{" "}
            — annuaire des prestataires labellisés
          </li>
        </ul>
      </section>

      <section className="card text-center bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <h2 className="text-2xl font-extrabold mb-2">
          L'État vous protège, Humanix vous prépare 🇫🇷
        </h2>
        <p className="opacity-90 mb-5">
          Notre rôle : que vos collaborateurs n'aient pas besoin d'arriver chez
          CyberMalveillance.gouv.fr. Mais s'ils en ont besoin, ils sauront y
          aller en premier réflexe.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/librairie"
            className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
          >
            Voir la librairie
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
