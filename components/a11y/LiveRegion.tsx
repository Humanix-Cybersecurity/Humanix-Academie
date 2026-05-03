// Region "aria-live" qui annonce les changements dynamiques aux lecteurs d'écran.
// - "polite" : attend que le SR ait fini ce qu'il dit (par défaut, recommandé)
// - "assertive" : interrompt le SR (à n'utiliser que pour erreurs critiques)
//
// Usage typique : changement d'état (achat reussi, niveau debloque, choix valide).
"use client";

import { useEffect, useState } from "react";

export type Politeness = "polite" | "assertive";

export default function LiveRegion({
  message,
  politeness = "polite",
  clearAfterMs = 4000,
}: {
  message: string | null;
  politeness?: Politeness;
  clearAfterMs?: number;
}) {
  const [current, setCurrent] = useState<string>("");

  useEffect(() => {
    if (!message) return;
    setCurrent(message);
    const t = setTimeout(() => setCurrent(""), clearAfterMs);
    return () => clearTimeout(t);
  }, [message, clearAfterMs]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        borderWidth: 0,
      }}
    >
      {current}
    </div>
  );
}
