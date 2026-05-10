// SPDX-License-Identifier: AGPL-3.0-or-later
// Defi tranquille du jour - un episode sans drama, ni pression.

export default function DailyGoalCard({
  completedToday,
  dailyGoal,
}: {
  completedToday: number;
  dailyGoal: number;
}) {
  const dailyPct =
    dailyGoal === 0
      ? 0
      : Math.min(100, Math.round((completedToday / dailyGoal) * 100));
  const reached = completedToday >= dailyGoal;

  return (
    <section aria-labelledby="daily-title">
      <div className="card bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-900/40">
        <div className="flex items-start gap-4">
          <div className="text-3xl animate-bounce-slow" aria-hidden="true">
            🌱
          </div>
          <div className="flex-1">
            <h2
              id="daily-title"
              className="font-display text-lg font-bold text-emerald-800 dark:text-emerald-200"
            >
              {reached
                ? "Ton defi du jour est valide"
                : "Ton defi tranquille du jour"}
            </h2>
            <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80 mb-3">
              {reached
                ? "Tu as fait ton temps cyber aujourd'hui. La regularite vaut mille sprints."
                : "Un episode aujourd'hui, c'est cinq minutes pour toi. Pas plus, pas moins."}
            </p>
            <div className="w-full h-2 bg-emerald-200/50 dark:bg-emerald-900/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                style={{ width: `${dailyPct}%` }}
              />
            </div>
            <p className="text-xs text-emerald-800/60 dark:text-emerald-200/60 mt-2 tabular-nums">
              {completedToday} / {dailyGoal} ·{" "}
              {reached && "objectif atteint"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
