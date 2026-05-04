"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Checkbox d'action de la checklist incident.
// Server action via toggleIncidentAction.

import { useState, useTransition } from "react";
import { toggleIncidentAction } from "@/app/admin/incidents/actions";

export default function IncidentActionCheckbox({
  actionId,
  initialDone,
  title,
  description,
  documentSlug,
  incidentId,
}: {
  actionId: string;
  initialDone: boolean;
  title: string;
  description?: string | null;
  documentSlug?: string | null;
  incidentId: string;
}) {
  const [done, setDone] = useState(initialDone);
  const [pending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !done;
    setDone(next);
    startTransition(async () => {
      try {
        await toggleIncidentAction(actionId, next);
      } catch {
        // rollback en cas d'echec
        setDone(!next);
      }
    });
  };

  return (
    <article
      className={`p-4 rounded-xl border-2 transition ${
        done
          ? "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700 opacity-70"
          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
      }`}
    >
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={done}
          disabled={pending}
          onChange={handleToggle}
          className="mt-1 w-5 h-5 accent-accent-500 cursor-pointer"
        />
        <div className="flex-1">
          <p
            className={`font-bold ${done ? "line-through text-gray-500 dark:text-gray-400" : "text-primary-500 dark:text-accent-300"}`}
          >
            {title}
          </p>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
              {description}
            </p>
          )}
          {documentSlug && (
            <a
              href={`/api/admin/incidents/${incidentId}/document/${documentSlug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-xs text-accent-600 dark:text-accent-300 hover:underline mt-2"
              onClick={(e) => e.stopPropagation()}
            >
              📄 Télécharger le document type
            </a>
          )}
        </div>
      </label>
    </article>
  );
}
