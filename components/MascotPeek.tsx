"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Mascotte qui "peek" en bas a droite des pages publiques.
// Bulle de dialogue contextuelle selon la page (audit, tarifs, anecdotes...).
// Ferme par croix, etat persiste en localStorage pour ne pas re-apparaitre
// pendant la session. Disparait en prefers-reduced-motion (n'anime pas).
//
// A11y :
//  - role="complementary" + aria-label
//  - bouton fermer avec aria-label
//  - tab-focusable
//  - hidden si prefers-reduced-motion ET dismissed

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Messages contextuels par chemin (matching prefix)
const MESSAGES: {
  match: (path: string) => boolean;
  text: string;
  cta?: { label: string; href: string };
}[] = [
  {
    match: (p) => p.startsWith("/audit-flash"),
    text: "5 minutes pour savoir où vous en êtes - et un PDF brandé en sortie. Promis !",
  },
  {
    match: (p) => p.startsWith("/tarifs"),
    text: "Pas sûr de l'offre ? Faites mon audit gratuit pour une reco perso.",
    cta: { label: "Faire l'audit (5 min)", href: "/audit-flash" },
  },
  {
    match: (p) => p.startsWith("/anecdotes"),
    text: "1 vraie histoire cyber chaque lundi, 1 leçon, 1 mini-action. Inscris-toi !",
  },
  {
    match: (p) => p.startsWith("/comparatif"),
    text: "On dit où on est moins bons. Étrange comme position commerciale, hein ?",
  },
  {
    match: (p) => p.startsWith("/famille"),
    text: "💕 Sécurise ton entreprise ET tes proches. Personne d'autre ne fait ça.",
  },
  {
    match: (p) => p.startsWith("/observatoire-fuites"),
    text: "Personne n'est à l'abri. Voici la preuve, mise à jour chaque jour.",
  },
  {
    match: (p) => p === "/",
    text: "Bienvenue ! Je suis Hex 🦊 - la mascotte HumaniX. Une question ?",
    cta: { label: "Voir la démo", href: "/demo" },
  },
];

// Pages ou la mascotte ne doit JAMAIS apparaitre (espace prive)
const HIDDEN_PREFIXES = [
  "/admin",
  "/apprendre",
  "/profil",
  "/boutique",
  "/connexion",
  "/demo/connexion",
];

export default function MascotPeek() {
  const path = usePathname() ?? "/";
  const [dismissed, setDismissed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Etat dismissed persiste en sessionStorage (pas localStorage : on
    // veut re-saluer a la prochaine visite si nouvelle session)
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("humanix-mascot-dismissed");
      if (stored === "true") setDismissed(true);
    }
    // Detection reduced motion
    if (typeof window !== "undefined" && window.matchMedia) {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mql.matches);
      const onChange = () => setReducedMotion(mql.matches);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("humanix-mascot-dismissed", "true");
    }
  };

  // Pas afficher tant que pas mounted (eviter mismatch SSR)
  if (!mounted) return null;
  if (dismissed) return null;

  // Pages privees : on n'affiche jamais
  if (HIDDEN_PREFIXES.some((p) => path.startsWith(p))) return null;

  // Trouve le message correspondant a la page
  const msg = MESSAGES.find((m) => m.match(path));
  if (!msg) return null;

  return (
    <aside
      role="complementary"
      aria-label="Message de la mascotte HumaniX"
      className={`fixed bottom-6 right-6 z-40 max-w-xs ${
        reducedMotion ? "" : "animate-fadeIn"
      }`}
    >
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-accent-500/40 p-4 pr-9">
        {/* Bouton fermer */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fermer le message de la mascotte"
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300"
        >
          ✕
        </button>

        {/* Mascotte */}
        <div className="flex items-start gap-3">
          <div
            className={`text-4xl shrink-0 ${reducedMotion ? "" : "animate-bounce-slow"}`}
            aria-hidden="true"
          >
            🦊
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-accent-500 mb-0.5">Hex</p>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">
              {msg.text}
            </p>
            {msg.cta && (
              <a
                href={msg.cta.href}
                className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-accent-500 hover:text-accent-600"
              >
                {msg.cta.label} →
              </a>
            )}
          </div>
        </div>

        {/* Triangle de bulle (decoratif) */}
        <div
          aria-hidden="true"
          className="absolute -bottom-2 right-8 w-4 h-4 bg-white dark:bg-slate-800 border-r-2 border-b-2 border-accent-500/40 transform rotate-45"
        />
      </div>
    </aside>
  );
}
