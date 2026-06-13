// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Panneau « Récidivistes phishing » sur /admin/users/at-risk.
// Server component : les boutons d'assignation appellent une server action.

import type { RepeatOffender } from "@/lib/phishing/repeat-offenders";
import { assignPhishingRemediationAction } from "@/app/admin/users/at-risk/actions";

export default function RepeatOffendersPanel({
  offenders,
  minFails,
  canAct,
}: {
  offenders: RepeatOffender[];
  minFails: number;
  canAct: boolean;
}) {
  return (
    <section
      aria-labelledby="repeat-offenders-title"
      className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 p-5"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <h2
          id="repeat-offenders-title"
          className="font-display font-bold text-rose-900 dark:text-rose-200"
        >
          🎣 Récidivistes phishing
        </h2>
        <span className="text-xs text-rose-700 dark:text-rose-300">
          ≥ {minFails} simulations échouées
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Collaborateurs qui ont cliqué (ou saisi leurs identifiants) sur
        plusieurs simulations. Assignez-leur un module anti-phishing ciblé
        — l&apos;assignation est une décision RSSI/admin, jamais automatique.
      </p>

      {offenders.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucun récidiviste au seuil actuel. 🎉
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-rose-200/60 dark:border-rose-900/40">
                <th className="py-2 pr-4">Collaborateur</th>
                <th className="py-2 pr-4">Service</th>
                <th className="py-2 pr-4 text-center">Échecs</th>
                <th className="py-2 pr-4 text-center">Saisies</th>
                <th className="py-2 pr-4">Dernier échec</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {offenders.map((o) => (
                <tr
                  key={o.userId}
                  className="border-b border-rose-100/60 dark:border-rose-900/20"
                >
                  <td className="py-2 pr-4">
                    <div className="font-medium">{o.name || "—"}</div>
                    <div className="text-xs text-gray-500">{o.email}</div>
                  </td>
                  <td className="py-2 pr-4">{o.service ?? "—"}</td>
                  <td className="py-2 pr-4 text-center font-bold text-rose-700 dark:text-rose-300">
                    {o.failCount}
                  </td>
                  <td className="py-2 pr-4 text-center">
                    {o.submitCount > 0 ? (
                      <span
                        className="font-bold text-rose-700 dark:text-rose-300"
                        title="A saisi ses identifiants sur une fausse page"
                      >
                        {o.submitCount}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-500">
                    {o.lastFailAt
                      ? o.lastFailAt.toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                  <td className="py-2">
                    {o.remediationAssigned ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-300">
                        ✓ module assigné
                      </span>
                    ) : canAct ? (
                      <form action={assignPhishingRemediationAction}>
                        <input type="hidden" name="userId" value={o.userId} />
                        <button
                          type="submit"
                          className="btn-secondary text-xs whitespace-nowrap"
                        >
                          Assigner le module anti-phishing
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
