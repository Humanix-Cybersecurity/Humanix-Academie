// SPDX-License-Identifier: AGPL-3.0-or-later
// Section pedagogique : "Comment ca marche" - explique le systeme Ed25519.
// Statique, juste du texte. Reservee a la page /admin/license.

export default function LicenseExplainer() {
  return (
    <section
      aria-labelledby="explainer-title"
      className="rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/30 border-2 border-cyan-200 dark:border-cyan-900/40 p-6 sm:p-8"
    >
      <p className="text-xs uppercase tracking-[0.25em] font-bold text-cyan-700 dark:text-cyan-300 mb-2">
        Comment ça marche
      </p>
      <h2
        id="explainer-title"
        className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-4"
      >
        Le système de licence Humanix
      </h2>
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
        <p>
          Humanix Cybersecurity émet une licence{" "}
          <strong>Ed25519 signée</strong> qui débloque les features payantes
          (Pack NIS2 turnkey, phishing IA, vishing, marketplace…) en self-host
          commercial. La licence est vérifiée localement par l'app, sans appel
          à Humanix : <strong>fonctionne offline</strong>, avec cache mémoire
          5 minutes.
        </p>
        <p>
          <strong>Pour les utilisateurs cloud SaaS</strong>, la licence n'est
          pas pertinente - le plan est géré par votre espace de facturation
          Humanix.
        </p>
        <p>
          <strong>Pour les self-host AGPLv3</strong>, sans licence configurée,
          l'app fonctionne en plan{" "}
          <code className="px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 rounded text-cyan-800 dark:text-cyan-200 font-mono">
            starter
          </code>{" "}
          (sub-tier free, 5 sièges) avec les features de base. Pour activer le
          palier Pro ou Enterprise, il faut une licence valide.
        </p>
        <p className="italic text-gray-600 dark:text-gray-300">
          Transparence assumée : ce système n'est pas opposable légalement à un
          client AGPLv3 motivé qui patcherait la vérification. C'est l'esprit
          de l'AGPL - la vraie protection commerciale vient du service, du
          trademark et de l'expertise. Cf.{" "}
          <code className="px-1 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 rounded text-cyan-800 dark:text-cyan-200 font-mono text-xs">
            docs/OPEN_CORE.md
          </code>
          .
        </p>
      </div>
    </section>
  );
}
