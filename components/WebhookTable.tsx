"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Table des webhooks (vue admin/integrations).
// Server-actions passees via props pour rester en harmonie avec le reste.

import { WEBHOOK_EVENTS, WebhookEventKey } from "@/lib/webhooks/events";

type Row = {
  id: string;
  label: string;
  type: "SLACK" | "TEAMS" | "GENERIC" | "JIRA" | "SERVICENOW" | "PAGERDUTY";
  urlMasked: string;
  events: string[];
  isActive: boolean;
  successCount: number;
  failureCount: number;
  lastFiredAt: string | null;
  lastError: string | null;
};

type Props = {
  webhooks: Row[];
  onDeleteAction: (formData: FormData) => Promise<void>;
  onTestAction: (formData: FormData) => Promise<void>;
  onToggleAction: (formData: FormData) => Promise<void>;
};

const TYPE_LABEL = {
  SLACK: { name: "Slack", emoji: "💬" },
  TEAMS: { name: "Teams", emoji: "🟦" },
  GENERIC: { name: "Générique", emoji: "🔌" },
  JIRA: { name: "Jira", emoji: "🟦" },
  SERVICENOW: { name: "ServiceNow", emoji: "🟩" },
  PAGERDUTY: { name: "PagerDuty", emoji: "🟧" },
} as const;

export default function WebhookTable({
  webhooks,
  onDeleteAction,
  onTestAction,
  onToggleAction,
}: Props) {
  if (webhooks.length === 0) {
    return (
      <div className="card text-center text-gray-500 dark:text-gray-300">
        Aucun webhook configuré pour le moment. Ajoutez votre premier
        ci-dessous.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full border-collapse min-w-[800px]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-slate-700">
            <th scope="col" className="p-3">
              Webhook
            </th>
            <th scope="col" className="p-3">
              Type
            </th>
            <th scope="col" className="p-3">
              Évènements
            </th>
            <th scope="col" className="p-3">
              État
            </th>
            <th scope="col" className="p-3">
              Stats
            </th>
            <th scope="col" className="p-3">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {webhooks.map((w) => (
            <tr
              key={w.id}
              className="border-b border-gray-100 dark:border-slate-800 align-top"
            >
              <td className="p-3">
                <p className="font-bold text-primary-500">{w.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all mt-0.5">
                  {w.urlMasked}
                </p>
              </td>
              <td className="p-3 whitespace-nowrap">
                <span className="text-sm">
                  <span aria-hidden="true">{TYPE_LABEL[w.type].emoji}</span>{" "}
                  {TYPE_LABEL[w.type].name}
                </span>
              </td>
              <td className="p-3">
                <ul className="text-xs space-y-0.5">
                  {w.events.slice(0, 3).map((e) => (
                    <li key={e}>
                      • {WEBHOOK_EVENTS[e as WebhookEventKey]?.label ?? e}
                    </li>
                  ))}
                  {w.events.length > 3 && (
                    <li className="text-gray-500">
                      + {w.events.length - 3} autres
                    </li>
                  )}
                </ul>
              </td>
              <td className="p-3 whitespace-nowrap">
                {w.isActive ? (
                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                    ✓ Actif
                  </span>
                ) : (
                  <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                    ⏸ Inactif
                  </span>
                )}
              </td>
              <td className="p-3 text-xs">
                <p className="text-green-700">✓ {w.successCount} succès</p>
                <p
                  className={
                    w.failureCount > 0 ? "text-red-600" : "text-gray-400"
                  }
                >
                  ✕ {w.failureCount} échecs
                </p>
                {w.lastFiredAt && (
                  <p className="text-gray-500 mt-1">
                    Dernier : {new Date(w.lastFiredAt).toLocaleString("fr-FR")}
                  </p>
                )}
                {w.lastError && (
                  <p
                    className="text-red-600 mt-1 max-w-[200px] line-clamp-2"
                    title={w.lastError}
                  >
                    ⚠ {w.lastError}
                  </p>
                )}
              </td>
              <td className="p-3 whitespace-nowrap">
                <div className="flex gap-1">
                  <form action={onTestAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <button
                      type="submit"
                      className="text-xs px-2 py-1 rounded bg-accent-50 text-accent-700 hover:bg-accent-100"
                      aria-label={`Tester le webhook ${w.label}`}
                    >
                      Tester
                    </button>
                  </form>
                  <form action={onToggleAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <button
                      type="submit"
                      className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                      aria-label={
                        w.isActive
                          ? `Désactiver ${w.label}`
                          : `Activer ${w.label}`
                      }
                    >
                      {w.isActive ? "Désactiver" : "Activer"}
                    </button>
                  </form>
                  <form action={onDeleteAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <button
                      type="submit"
                      className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                      aria-label={`Supprimer le webhook ${w.label}`}
                      onClick={(e) => {
                        if (
                          !confirm(
                            `Supprimer définitivement le webhook "${w.label}" ?`,
                          )
                        )
                          e.preventDefault();
                      }}
                    >
                      Supprimer
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
