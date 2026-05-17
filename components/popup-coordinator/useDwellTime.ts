"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Hook utilitaire : retourne `true` apres `ms` millisecondes passees sur
// la page courante (montage du composant). Sert a delayer les popups
// non-essentielles pour laisser l'utilisateur respirer.
//
// Usage :
//   const dwelled = useDwellTime(8000); // 8s
//   const ready = dwelled && !dismissed;

import { useEffect, useState } from "react";

export function useDwellTime(ms: number): boolean {
  const [reached, setReached] = useState(false);

  useEffect(() => {
    if (ms <= 0) {
      setReached(true);
      return;
    }
    const t = window.setTimeout(() => setReached(true), ms);
    return () => window.clearTimeout(t);
  }, [ms]);

  return reached;
}
