// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useEffect, useState } from "react";

/**
 * Bandeau « X / N mondes terminés » sur le hub enfants. Lu depuis localStorage
 * (aucune donnée serveur). Caché tant qu'aucun monde n'est terminé, pour ne pas
 * accueillir un nouvel enfant avec un « 0/12 » décourageant.
 */
export default function ProgressGlobal({ slugs }: { slugs: string[] }) {
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    try {
      let n = 0;
      for (const s of slugs) {
        const d = JSON.parse(localStorage.getItem(`hex-ecole.${s}`) || "{}");
        if (d.done) n += 1;
      }
      setDone(n);
    } catch {
      setDone(null);
    }
  }, [slugs]);

  if (done === null || done === 0) return null;
  const total = slugs.length;
  const pct = Math.round((done / total) * 100);
  const fini = done >= total;

  return (
    <div className="mt-6 max-w-md mx-auto rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 p-4">
      <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
        🌟 {done} / {total} mondes terminés
        {fini && " - tu as tout fini, bravo !"}
      </p>
      <div className="h-3 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
