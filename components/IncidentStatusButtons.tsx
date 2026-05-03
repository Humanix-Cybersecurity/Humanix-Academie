"use client";

// Boutons de transition de statut d'un incident.

import { useTransition } from "react";
import { changeIncidentStatus } from "@/app/admin/incidents/actions";

const NEXT_BY_STATUS: Record<string, { value: string; label: string; variant: "primary" | "secondary" }[]> = {
  OPEN: [
    { value: "IN_PROGRESS", label: "▶ Démarrer la réponse", variant: "primary" },
  ],
  IN_PROGRESS: [
    { value: "CONTAINED", label: "🛡 Marquer contenu", variant: "primary" },
  ],
  CONTAINED: [
    { value: "RESOLVED", label: "✅ Marquer résolu", variant: "primary" },
  ],
  RESOLVED: [
    { value: "CLOSED", label: "📋 Clôturer (RetEx fait)", variant: "primary" },
  ],
  CLOSED: [],
};

export default function IncidentStatusButtons({
  incidentId,
  currentStatus,
}: {
  incidentId: string;
  currentStatus: string;
}) {
  const [pending, startTransition] = useTransition();
  const transitions = NEXT_BY_STATUS[currentStatus] ?? [];

  if (transitions.length === 0) {
    return (
      <p className="text-xs text-gray-500 italic">
        Incident clôturé. Aucune transition possible.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((t) => (
        <button
          key={t.value}
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              !confirm(
                `Confirmer la transition vers : ${t.label.replace(/[^\w\s]/g, "").trim()} ?`,
              )
            )
              return;
            startTransition(async () => {
              await changeIncidentStatus(incidentId, t.value);
            });
          }}
          className={
            t.variant === "primary"
              ? "btn-primary text-sm py-2 px-4"
              : "btn-secondary text-sm py-2 px-4"
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
