// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget : queue des demandes d'effacement RGPD article 17.
// Affiche : personne concernee / date demande / etat / delai depuis.
// Flag "en retard" si > 30 jours sans completion.

export type QueueRow = {
  id: string;
  targetLabel: string | null;
  targetId: string | null;
  requestedAt: Date;
  completedAt: Date | null;
  isLate: boolean;
  daysSince: number;
};

export default function ErasureQueue({ queue }: { queue: QueueRow[] }) {
  if (queue.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        Aucune demande d'effacement enregistree dans les 90 derniers jours.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-sm min-w-[600px]">
        <caption className="sr-only">
          Demandes d'effacement RGPD article 17 enregistrees dans les 90
          derniers jours, avec personne concernee, date de demande, etat de
          traitement et delai legal restant
        </caption>
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700 text-left">
            <th className="p-2 font-medium text-gray-700 dark:text-gray-300">
              Personne concernee
            </th>
            <th className="p-2 font-medium text-gray-700 dark:text-gray-300">
              Demande recue
            </th>
            <th className="p-2 font-medium text-gray-700 dark:text-gray-300">
              Etat
            </th>
            <th className="p-2 font-medium text-gray-700 dark:text-gray-300">
              Delai
            </th>
          </tr>
        </thead>
        <tbody>
          {queue.map((q) => (
            <tr
              key={q.id}
              className="border-b border-gray-100 dark:border-slate-800"
            >
              <td className="p-2 text-gray-800 dark:text-gray-200">
                {q.targetLabel ?? q.targetId ?? "-"}
              </td>
              <td className="p-2 text-gray-600 dark:text-gray-400 tabular-nums">
                {q.requestedAt.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="p-2">
                {q.completedAt ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                    <span aria-hidden="true">✅</span>
                    Termine le{" "}
                    {q.completedAt.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                ) : q.isLate ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
                    <span aria-hidden="true">⚠</span>
                    En retard
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
                    <span aria-hidden="true">⏳</span>
                    En cours
                  </span>
                )}
              </td>
              <td className="p-2 text-gray-600 dark:text-gray-400 tabular-nums">
                {q.daysSince} j
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
