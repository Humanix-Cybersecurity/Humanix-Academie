// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import type { ReactNode } from "react";

/** Hex le renard + une bulle. Guide récurrent de l'espace enfants. */
export default function HexDit({
  mood = "happy",
  children,
  size = "md",
}: {
  mood?: "happy" | "curious" | "celebrate" | "think";
  children: ReactNode;
  size?: "md" | "lg";
}) {
  const face =
    mood === "celebrate"
      ? "🦊🎉"
      : mood === "curious"
        ? "🦊❓"
        : mood === "think"
          ? "🦊💭"
          : "🦊";
  const faceSize = size === "lg" ? "text-5xl sm:text-6xl" : "text-4xl";
  return (
    <div className="flex items-start gap-3">
      <div className={`${faceSize} shrink-0 leading-none`} aria-hidden="true">
        {face}
      </div>
      <div className="relative rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-900/50 px-4 py-3 text-base sm:text-lg font-medium text-gray-800 dark:text-gray-100 shadow-sm">
        <span className="sr-only">Hex dit : </span>
        {children}
      </div>
    </div>
  );
}
