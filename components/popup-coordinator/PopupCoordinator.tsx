"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Coordinateur de popups : empeche l'empilement visuel des modals/banners
// en n'autorisant qu'UN SEUL slot prioritaire visible a la fois.
//
// POURQUOI : feedback utilisateurs au pre-launch sur l'empilement de
// popups au 1er chargement (CookieBanner + MascotPeek + PWAInstallButton
// + HexChat tooltip se superposent en bas-droite).
//
// ARCHITECTURE :
//   - Provider tient slotsRef (Map<id, Slot>) + subscribers + cooldown.
//   - Chaque popup appelle `usePopupSlot({ id, priority, ready })`.
//   - Le hook s'abonne via `subscribe(force)` et se re-render quand un
//     slot change. Il lit `isAllowed(id)` en render pour decider.
//   - Cooldown 1.5s applique UNIQUEMENT quand un slot transitionne
//     ready=true -> false (ou unmount) — pas a chaque setSlot.
//
// BUG HISTORIQUE FIXE (commit 9070eb7 -> hotfix) :
// La 1ere version passait `value={{ register, update, isAllowed }}` au
// Provider, un objet litteral recree a chaque render. Resultat :
// `ctx` changeait chaque render -> consumers re-rendaient -> leurs
// useEffect re-firaient cleanup+register -> appel `force()` -> render
// Provider -> ... boucle infinie qui freezait le main thread (clics
// non-reactifs, sans erreur console car setTimeout cassait la chaine).
// Fix : useMemo pour value + subscription pattern explicite.
//
// PRIORITES :
//   100 = CookieBanner   (legal, bloquant)
//    50 = PWAInstallButton (monetisation-adjacent)
//    30 = HexChat tooltip  (feature discovery)
//    10 = MascotPeek       (delight, lowest)
//
// FALLBACK : sans Provider dans l'arbre, le hook retourne `true` ->
// aucune regression sur les composants existants.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
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
  /** Set/update les proprietes d'un slot (declenche notify aux subscribers). */
  setSlot: (slot: Slot) => void;
  /** Retire un slot du registre (declenche cooldown si etait ready). */
  removeSlot: (id: string) => void;
  /** True si ce slot est le winner actuel (priorite max parmi ready=true). */
  isAllowed: (id: string) => boolean;
  /** S'abonne aux changements de slots. Retourne unsubscribe. */
  subscribe: (cb: () => void) => () => void;
};

const Ctx = createContext<CoordinatorAPI | null>(null);

export function PopupCoordinatorProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Etat partage via refs (pas de re-render du Provider sur chaque setSlot).
  const slotsRef = useRef<Map<string, Slot>>(new Map());
  const subscribersRef = useRef<Set<() => void>>(new Set());
  const cooldownUntilRef = useRef(0);

  const notify = useCallback(() => {
    // Snapshot pour eviter mutation pendant iteration.
    [...subscribersRef.current].forEach((cb) => cb());
  }, []);

  const setSlot = useCallback(
    (slot: Slot) => {
      const previous = slotsRef.current.get(slot.id);
      slotsRef.current.set(slot.id, slot);
      // Cooldown si un slot "actif" (ready=true) vient de devenir inactif.
      if (previous?.ready && !slot.ready) {
        cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
        // Re-notify apres cooldown pour debloquer le prochain winner.
        window.setTimeout(notify, COOLDOWN_MS + 50);
      }
      notify();
    },
    [notify],
  );

  const removeSlot = useCallback(
    (id: string) => {
      const previous = slotsRef.current.get(id);
      slotsRef.current.delete(id);
      if (previous?.ready) {
        cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
        window.setTimeout(notify, COOLDOWN_MS + 50);
      }
      notify();
    },
    [notify],
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

  const subscribe = useCallback((cb: () => void) => {
    subscribersRef.current.add(cb);
    return () => {
      subscribersRef.current.delete(cb);
    };
  }, []);

  // IMPORTANT : value DOIT etre memoize. Sans ca, l'objet litteral est
  // recree a chaque render -> ctx change -> consumers re-render -> leurs
  // useEffect refirent cleanup+effet -> boucle de re-renders qui freeze
  // le main thread. Cf. bug fixe ci-dessus.
  const value = useMemo<CoordinatorAPI>(
    () => ({ setSlot, removeSlot, isAllowed, subscribe }),
    [setSlot, removeSlot, isAllowed, subscribe],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Demande au coordinateur si ce popup peut s'afficher maintenant.
 *
 * @returns true si ce slot est le winner courant (priorite la plus haute
 * parmi les `ready=true`), false sinon. Si aucun Provider n'enveloppe
 * l'arbre, retourne true (graceful fallback — les popups continuent de
 * fonctionner independamment).
 */
export function usePopupSlot(opts: {
  id: string;
  priority: number;
  ready: boolean;
}): boolean {
  const { id, priority, ready } = opts;
  const ctx = useContext(Ctx);
  const [, force] = useReducer((c: number) => c + 1, 0);

  // 1. S'abonner aux changements (re-render quand un autre slot bouge).
  //    Deps : [ctx] uniquement -> stable grace au useMemo cote Provider,
  //    donc cet effect ne se re-souscrit qu'au mount.
  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe(force);
  }, [ctx]);

  // 2. Maintenir le slot a jour quand id/priority/ready changent.
  //    setSlot ne declenche cooldown QUE sur transition ready true->false.
  useEffect(() => {
    if (!ctx) return;
    ctx.setSlot({ id, priority, ready });
  }, [ctx, id, priority, ready]);

  // 3. Cleanup au unmount reel (composant disparait de l'arbre).
  useEffect(() => {
    if (!ctx) return;
    return () => ctx.removeSlot(id);
  }, [ctx, id]);

  if (!ctx) return true;
  return ctx.isAllowed(id);
}
