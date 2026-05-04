// SPDX-License-Identifier: AGPL-3.0-or-later
// Hook + utilitaires accessibilité reutilisables.
"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook qui retourne un setter pour announcer un message aux lecteurs d'écran
 * via une LiveRegion globale.
 * Le message s'auto-clear pour permettre des annonces consécutives.
 */
export function useAnnouncer(): {
  message: string | null;
  announce: (msg: string) => void;
  reset: () => void;
} {
  const [message, setMessage] = useState<string | null>(null);

  const announce = useCallback((msg: string) => {
    // Force un re-render même si on annonce 2 fois la meme chose
    setMessage(null);
    setTimeout(() => setMessage(msg), 50);
  }, []);

  const reset = useCallback(() => setMessage(null), []);

  return { message, announce, reset };
}

/**
 * Detecte si l'utilisateur a configuré son OS pour réduire les animations.
 * À utiliser pour désactiver confettis, transitions, etc. côté logique.
 * (Le CSS `prefers-reduced-motion` couvre déjà la plupart des cas.)
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
