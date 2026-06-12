// SPDX-License-Identifier: AGPL-3.0-or-later
// Section "tarifs" : invitation tranquille a consulter /tarifs.
// On ne deploie PAS le pricing detaille sur la home pour rester < 5 sections.

import Link from "next/link";

export default function PricingTeaser() {
  return (
    <section className="max-w-4xl mx-auto px-4 mb-20">
      <div className="text-center bg-white dark:bg-slate-900 rounded-3xl p-10 border-2 border-accent-500/30 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-3">
          Tarifs transparents
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
          Self-host gratuit ou cloud à partir de{" "}
          <span className="tabular-nums">0 €</span>.
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-xl mx-auto leading-relaxed">
          Pas de tarif à 4 chiffres. Pas d'engagement piège. Pas de jargon.
          Quatre paliers limpides - Community, Starter, Pro, Enterprise.
        </p>
        <Link
          href="/tarifs"
          className="btn-primary inline-flex items-center gap-2"
        >
          Voir les tarifs détaillés <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
