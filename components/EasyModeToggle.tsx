"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Bouton "Mode facile" : agrandit la typo, ralentit les animations,
// pour les profils peu numeriques / dyslexiques / seniors.
import { useEffect, useState } from "react";

export default function EasyModeToggle() {
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("humanix-easy-mode") === "true";
    setActive(saved);
    if (saved) document.body.classList.add("easy-mode");
  }, []);

  const toggle = () => {
    const next = !active;
    setActive(next);
    localStorage.setItem("humanix-easy-mode", String(next));
    document.body.classList.toggle("easy-mode", next);
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition border-2 ${
        active
          ? "bg-accent-500 text-white border-accent-500"
          : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-accent-500"
      }`}
      aria-pressed={active}
      aria-label={
        active
          ? "Désactiver le mode facile (texte plus grand)"
          : "Activer le mode facile (texte plus grand)"
      }
    >
      <span className="text-xl">🔠</span>
      Mode facile {active ? "✓" : ""}
    </button>
  );
}
