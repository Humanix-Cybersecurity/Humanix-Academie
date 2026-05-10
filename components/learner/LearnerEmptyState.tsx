// SPDX-License-Identifier: AGPL-3.0-or-later
// Etat vide : aucune saison active pour le tenant de l'user.

export default function LearnerEmptyState() {
  return (
    <section className="card text-center py-16 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border-emerald-200 dark:border-emerald-900/40">
      <p className="text-6xl mb-4 animate-float" aria-hidden="true">
        🌿
      </p>
      <h2 className="font-display text-xl font-bold text-primary-500 dark:text-accent-300 mb-2">
        Ton voyage commencera bientot
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">
        Aucune saison n'est encore active pour ton entreprise. Demande a ta
        direction d'activer un module - c'est rapide.
      </p>
    </section>
  );
}
