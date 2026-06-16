// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useEffect, useState } from "react";

/** Badge « déjà joué » lu depuis localStorage (aucune donnée serveur). */
export default function MondeBadge({
  slug,
  total,
}: {
  slug: string;
  total: number;
}) {
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(`hex-ecole.${slug}`) || "{}");
      if (d.done) setBest(Number(d.bestStars) || 0);
    } catch {
      /* localStorage indisponible : pas de badge, c'est tout. */
    }
  }, [slug]);

  if (best === null) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 text-amber-700 text-xs font-bold px-2 py-0.5">
      ⭐ {best}/{total} · déjà joué
    </span>
  );
}
