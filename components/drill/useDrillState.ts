"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Hook de POLLING de l'etat d'un exercice de crise (~2s). Pas de WebSocket :
// suffisant pour un drill de 15 min, et zero infra en plus.

import { useCallback, useEffect, useRef, useState } from "react";
import type { DrillStateResponse } from "@/lib/drill/state-types";

export function useDrillState(exerciseId: string, intervalMs = 2000) {
  const [state, setState] = useState<DrillStateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/drill/${exerciseId}`, {
        cache: "no-store",
      });
      if (!alive.current) return;
      if (!res.ok) {
        setError(String(res.status));
        return;
      }
      setState((await res.json()) as DrillStateResponse);
      setError(null);
    } catch {
      if (alive.current) setError("network");
    }
  }, [exerciseId]);

  useEffect(() => {
    alive.current = true;
    refresh();
    const t = setInterval(refresh, intervalMs);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [refresh, intervalMs]);

  return { state, error, refresh };
}

/** POST une action ({action:"join"|"answer"|"advance", ...}) sur l'exercice. */
export async function drillAction(
  exerciseId: string,
  body: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/drill/${exerciseId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}
