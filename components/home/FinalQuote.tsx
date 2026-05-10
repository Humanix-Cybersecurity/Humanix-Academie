// SPDX-License-Identifier: AGPL-3.0-or-later
// Citation finale signature "Hex veille" - respiration de fin de page.

export default function FinalQuote() {
  return (
    <section className="text-center max-w-3xl mx-auto px-4 pb-20">
      <blockquote className="font-display italic text-lg sm:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed">
        « La cybersécurité, c'est moins une affaire d'expert qu'une habitude
        tranquille. »
      </blockquote>
      <p
        aria-hidden="true"
        className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
      >
        - Hex veille
      </p>
    </section>
  );
}
