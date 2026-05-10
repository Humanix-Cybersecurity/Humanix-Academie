// SPDX-License-Identifier: AGPL-3.0-or-later
// Liste des actions recommandees ordonnee par impact / facilite.

type Action = {
  label: string;
  difficulty: "easy" | "medium" | "hard";
  potentialPoints: number;
};

const DIFF_LABEL: Record<Action["difficulty"], string> = {
  easy: "facile",
  medium: "moyenne",
  hard: "élevée",
};

const DIFF_CLASS: Record<Action["difficulty"], string> = {
  easy: "text-emerald-600 dark:text-emerald-400 font-semibold",
  medium: "text-amber-600 dark:text-amber-400 font-semibold",
  hard: "text-rose-600 dark:text-rose-400 font-semibold",
};

export default function ActionPlan({ actions }: { actions: Action[] }) {
  return (
    <ol className="space-y-2 list-none">
      {actions.map((a, i) => (
        <li
          key={i}
          className="flex items-center gap-3 p-3 bg-gray-50/60 dark:bg-slate-800/40 rounded-lg border border-gray-100 dark:border-slate-800"
        >
          <span className="shrink-0 w-7 h-7 rounded-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-bold flex items-center justify-center text-sm tabular-nums">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              {a.label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Difficulté&nbsp;:{" "}
              <span className={DIFF_CLASS[a.difficulty]}>
                {DIFF_LABEL[a.difficulty]}
              </span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{a.potentialPoints}
            </p>
            <p className="text-[10px] uppercase text-gray-400 tracking-wide">
              pts/score
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
