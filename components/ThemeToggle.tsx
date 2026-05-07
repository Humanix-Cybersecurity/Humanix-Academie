"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Toggle dark/light avec persistance localStorage et respect des preferences systeme.
// Pas de flash blanc au chargement : on applique le theme en pre-script (cf. layout).
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export default function ThemeToggle({
  compact = false,
}: {
  compact?: boolean;
}) {
  // Default produit : "light". Le user peut basculer vers "system" ou "dark"
  // explicitement via le toggle. Cohérent avec le script anti-flash du layout.
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved =
      (localStorage.getItem("humanix-theme") as Theme | null) ?? "light";
    setTheme(saved);
  }, []);

  const apply = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("humanix-theme", t);
    const root = document.documentElement;
    if (
      t === "dark" ||
      (t === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  // Suit les changements systeme si on est en "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  if (!mounted) {
    // Placeholder pour eviter mismatch SSR/hydration
    return <div className="w-9 h-9" />;
  }

  if (compact) {
    // Bouton unique : cycle light → dark → system
    const next: Theme =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    const icon = theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "💻";
    const label =
      theme === "light"
        ? "Mode clair"
        : theme === "dark"
          ? "Mode sombre"
          : "Mode système";
    return (
      <button
        onClick={() => apply(next)}
        title={`${label} - clique pour changer`}
        aria-label={`Theme actuel : ${label}. Cliquer pour passer au mode ${next}`}
        className="w-9 h-9 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:scale-110 transition"
      >
        <span className="text-lg">{icon}</span>
      </button>
    );
  }

  return (
    <div
      className="inline-flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1"
      role="group"
      aria-label="Choix du thème"
    >
      <ThemeBtn
        current={theme}
        value="light"
        icon="☀️"
        label="Clair"
        onClick={() => apply("light")}
      />
      <ThemeBtn
        current={theme}
        value="system"
        icon="💻"
        label="Auto"
        onClick={() => apply("system")}
      />
      <ThemeBtn
        current={theme}
        value="dark"
        icon="🌙"
        label="Sombre"
        onClick={() => apply("dark")}
      />
    </div>
  );
}

function ThemeBtn({
  current,
  value,
  icon,
  label,
  onClick,
}: {
  current: Theme;
  value: Theme;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  const active = current === value;
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
        active
          ? "bg-white dark:bg-slate-700 text-primary-500 shadow-sm"
          : "text-gray-500 hover:text-primary-500"
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
