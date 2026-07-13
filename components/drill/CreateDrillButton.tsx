"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Bouton hote : cree une session d'exercice et ouvre le cockpit.

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateDrillButton({
  scenarioId,
}: {
  scenarioId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      const res = await fetch("/api/drill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      if (res.ok) {
        const { id } = (await res.json()) as { id: string };
        router.push(`/admin/exercice-crise/${id}`);
        return;
      }
    } catch {
      // ignore, on rend le bouton reutilisable
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={create}
      disabled={loading}
      className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl shadow-md transition-colors"
    >
      {loading ? "Création…" : "Lancer cet exercice →"}
    </button>
  );
}
