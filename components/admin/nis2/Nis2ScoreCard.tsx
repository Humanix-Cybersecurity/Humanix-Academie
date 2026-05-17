// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Widget : score NIS2 per-article temps reel d'un tenant.
// Affiche par defaut le score global + 11 cards article. Server component
// pur (donnees calculees en amont par computeTenantNis2Score).

import Link from "next/link";
import type { Nis2TenantScore } from "@/lib/nis2/score-tenant";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-xs font-bold">
        N/A
      </span>
    );
  }
  const color =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
        ? "bg-sky-500"
        : score >= 40
          ? "bg-amber-500"
          : "bg-red-500";
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[3rem] h-6 px-2 rounded-full ${color} text-white text-xs font-bold tabular-nums`}
    >
      {score}%
    </span>
  );
}

export default function Nis2ScoreCard({
  score,
}: {
  score: Nis2TenantScore;
}) {
  const globalColor =
    score.globalScore >= 80
      ? "text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
      : score.globalScore >= 60
        ? "text-sky-600 dark:text-sky-300 border-sky-300 dark:border-sky-800"
        : score.globalScore >= 40
          ? "text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-800"
          : "text-red-600 dark:text-red-300 border-red-300 dark:border-red-800";

  return (
    <div className="space-y-5">
      {/* Score global */}
      <div
        className={`rounded-xl border-2 ${globalColor} p-5 bg-white dark:bg-slate-900`}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold opacity-70 mb-1">
              Score conformité NIS2 (basé sur la complétion réelle)
            </p>
            <p className="text-4xl font-bold tabular-nums">
              {score.globalScore}
              <span className="text-xl opacity-70">/100</span>
            </p>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 max-w-xs text-right">
            {score.activeUsersCount} utilisateur
            {score.activeUsersCount > 1 ? "s" : ""} actif
            {score.activeUsersCount > 1 ? "s" : ""} pris en compte.
            Moyenne des articles couverts par tes saisons disponibles.
          </div>
        </div>
      </div>

      {/* Per-article */}
      <div className="grid sm:grid-cols-2 gap-3">
        {score.articles.map((a) => (
          <article
            key={a.article}
            className="rounded-lg border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
          >
            <header className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-bold text-accent-500 mb-0.5">
                  Art. {a.article}
                </p>
                <h3 className="font-bold text-sm text-primary-500 dark:text-accent-300 leading-tight">
                  {a.title}
                </h3>
              </div>
              <ScoreBadge score={a.score} />
            </header>
            {a.score === null ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                Aucune saison Humanix de cet article n&apos;est encore
                disponible dans ton catalogue.
              </p>
            ) : (
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {a.saisons.map((s) => (
                  <li
                    key={s.slug}
                    className="flex items-center justify-between gap-2"
                  >
                    <span
                      className={s.isAvailable ? "" : "italic opacity-60"}
                    >
                      {s.title}
                    </span>
                    {s.isAvailable ? (
                      <span className="tabular-nums font-medium">
                        {s.completion}%
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase opacity-60">
                        non installée
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>

      {/* Footer */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 p-4 text-xs text-blue-900 dark:text-blue-100">
        <p className="leading-relaxed">
          💡 <strong>Comment lire ce score</strong> — Pour chaque article NIS2,
          on calcule le ratio moyen de complétion des saisons mappées par tes
          utilisateurs actifs. Un article à 0 % signifie que tu as les saisons
          mais que personne ne les a finies. À N/A : tu n&apos;as pas encore
          installé les saisons concernées. Pour relancer ta cible :{" "}
          <Link
            href="/admin/utilisateurs"
            className="underline font-bold hover:no-underline"
          >
            console utilisateurs
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
