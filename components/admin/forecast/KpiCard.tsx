// SPDX-License-Identifier: AGPL-3.0-or-later
// Sous-composant : KPI card avec ton (good/bad/neutral).
// Reutilise dans les 3 sections de la page forecast.

export default function KpiCard({
  label,
  value,
  help,
  tone = "neutral",
}: {
  label: string;
  value: string;
  help: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const toneCls =
    tone === "good"
      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/20"
      : tone === "bad"
        ? "border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-900/20"
        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900";
  return (
    <div className={`rounded-2xl border-2 p-4 ${toneCls}`}>
      <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </p>
      <p className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums">
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
        {help}
      </p>
    </div>
  );
}
