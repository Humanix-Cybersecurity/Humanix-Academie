// SPDX-License-Identifier: AGPL-3.0-or-later
// Citation chaleureuse de fin de hub. Signature "Hex veille".

export default function CloseQuote({ citation }: { citation: string }) {
  return (
    <section aria-hidden={false} className="text-center pt-6 pb-2">
      <blockquote className="font-display text-lg sm:text-xl italic text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
        « {citation} »
      </blockquote>
      <p
        className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
        aria-hidden="true"
      >
        - Hex veille
      </p>
    </section>
  );
}
