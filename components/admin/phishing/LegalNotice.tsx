// SPDX-License-Identifier: AGPL-3.0-or-later
// Bandeau cadre legal phishing - statique, RGPD article 32 + Code penal 323.

export default function LegalNotice() {
  return (
    <article className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/15 p-4">
      <h3 className="font-bold text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
        <span aria-hidden="true">⚖️</span>
        Cadre éthique et légal
      </h3>
      <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-2 leading-relaxed">
        Les simulations doivent être{" "}
        <strong>annoncées préalablement</strong> aux salariés (charte, CSE).
        Aucun usage disciplinaire des résultats. Pas de stigmatisation : seuls
        les chiffres agrégés sont exploités. Conformément au RGPD (art. 32) et
        au Code pénal (art. 323), ces tests sont des
        <strong> exercices pédagogiques</strong>, pas des attaques.
      </p>
    </article>
  );
}
