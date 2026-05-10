// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget : feed des 30 dernieres actions RGPD du tenant.

import { ACTION_EMOJI, ACTION_LABEL } from "./actionLabels";

export type RecentEntry = {
  id: string;
  action: string;
  targetLabel: string | null;
  actorEmail: string | null;
  createdAt: Date;
};

export default function RecentActivity({ entries }: { entries: RecentEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        Aucune activite RGPD enregistree.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((r) => (
        <li
          key={r.id}
          className="flex items-start gap-3 text-sm border-b border-gray-100 dark:border-slate-800 last:border-0 pb-2"
        >
          <span className="text-lg shrink-0" aria-hidden="true">
            {ACTION_EMOJI[r.action] ?? "•"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 dark:text-gray-200">
              <span className="font-medium">
                {ACTION_LABEL[r.action] ?? r.action}
              </span>
              {r.targetLabel && (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-gray-600 dark:text-gray-400">
                    {r.targetLabel}
                  </span>
                </>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {r.createdAt.toLocaleString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {r.actorEmail && ` · ${r.actorEmail}`}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
