"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Coordinateur de popups : empeche l'empilement visuel des modals/banners
// en n'autorisant qu'UN SEUL slot prioritaire visible a la fois.
//
// POURQUOI : feedback utilisateurs au pre-launch — "trop de popins au
// premier chargement". On avait CookieBanner (z-100, plein bas) +
// MascotPeek (z-40, bas-droite) + PWAInstallButton (z-30, bas-droite a 4s)
// + HexChat tooltip (z-40, bas-droite a 6s). Les 3 dernieres se
// superposent visuellement entre 0-6s, plus le cookie qui prend la
// largeur. Resultat : page d'accueil qui "veut me vendre 3 trucs a la
// fois", -conversion en proportion.
//
// COMMENT : chaque composant popup appelle `usePopupSlot({ id, priority,
// ready })`. Le coordinateur designe le winner (priority la plus haute,
// ready=true). Seul le winner voit son hook retourner `true` ; les autres
// attendent leur tour. Cooldown de 1.5s entre 2 popups pour eviter le
// "ping-pong" visuel.
//
// PRIORITES (constantes exportees plus bas) :
//   100 = CookieBanner   (legal, bloquant)
//    50 = PWAInstallButton (monetisation-adjacent)
//    30 = HexChat tooltip  (feature discovery)
//    10 = MascotPeek       (delight, lowest)
//
// FALLBACK : si le Provider n'est pas dans l'arbre (test, page exotique),
// le hook retourne `true` par defaut — les composants restent
// fonctionnels comme avant, juste sans coordination. Pas de regression.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const COOLDOWN_MS = 1500;

export const POPUP_PRIORITY = {
  cookie: 100,
  pwa: 50,
  hexTooltip: 30,
  mascot: 10,
} as const;

type Slot = { id: string; priority: number; ready: boolean };

type CoordinatorAPI = {
  register: (slot: Slot) => () => void;
  update: (slot: Slot) => void;
  isAllowed: (id: string) => boolean;
};

const Ctx = createContext<CoordinatorAPI | null>(null);

export function PopupCoordinatorProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Map<id, Slot> : etat partage entre tous les consumers.
  // useRef pour eviter les re-renders inutiles a chaque mutation ;
  // on declenche manuellement via `setTick`.
  const slotsRef = useRef<Map<string, Slot>>(new Map());
  const cooldownUntilRef = useRef(0);
  const [, setTick] = useState(0);
  const force = useCallback(() => setTick((t) => t + 1), []);

  const update = useCallback(
    (slot: Slot) => {
      slotsRef.current.set(slot.id, slot);
      force();
    },
    [force],
  );

  const register = useCallback(
    (slot: Slot) => {
      slotsRef.current.set(slot.id, slot);
      force();
      return () => {
        slotsRef.current.delete(slot.id);
        cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
        force();
        // Re-evalue apres cooldown pour debloquer le prochain winner
        window.setTimeout(force, COOLDOWN_MS + 50);
      };
    },
    [force],
  );

  const isAllowed = useCallback((id: string): boolean => {
    if (Date.now() < cooldownUntilRef.current) return false;
    let winner: Slot | null = null;
    for (const s of slotsRef.current.values()) {
      if (!s.ready) continue;
      if (!winner || s.priority > winner.priority) winner = s;
    }
    return winner?.id === id;
  }, []);

  return (
    <Ctx.Provider value={{ register, update, isAllowed }}>
      {children}
    </Ctx.Provider>
  );
}

/**
 * Demande au coordinateur si ce popup peut s'afficher maintenant.
 *
 * @returns true si ce slot est le winner courant (priorite la plus haute
 * parmi les `ready=true`), false sinon. Si aucun Provider n'enveloppe
 * l'arbre, retourne true (graceful fallback).
 *
 * Exemple :
 * ```tsx
 * const canShow = usePopupSlot({
 *   id: "pwa-install",
 *   priority: POPUP_PRIORITY.pwa,
 *   ready: !installed && !dismissed && delayElapsed,
 * });
 * if (!canShow) return null;
 * ```
 */
export function usePopupSlot(opts: {
  id: string;
  priority: number;
  ready: boolean;
}): boolean {
  const { id, priority, ready } = opts;
  const ctx = useContext(Ctx);

  useEffect(() => {
    if (!ctx) return;
    // Le register renvoie un cleanup qui delete + trigger cooldown.
    return ctx.register({ id, priority, ready });
  }, [ctx, id, priority, ready]);

  // Pas de Provider : on n'empeche rien, le composant decide seul.
  if (!ctx) return true;
  return ctx.isAllowed(id);
}
