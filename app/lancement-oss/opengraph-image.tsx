// SPDX-License-Identifier: AGPL-3.0-or-later
// OG card dynamique : compte à rebours jusqu'au launch AGPLv3 (26 mai 2026).
// Recalculé à chaque hit (force-dynamic) pour suivre les jours qui défilent.
import { OG_SIZE, OG_CONTENT_TYPE, renderOgCard } from "@/lib/og-card";

export const alt = "Bientôt libre, ensemble — Humanix Académie passe en open source AGPLv3 le 26 mai 2026";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const LAUNCH_DATE = new Date("2026-05-26T09:00:00+02:00");

function daysUntilLaunch(now = new Date()): number {
  const diff = LAUNCH_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default async function Image() {
  const days = daysUntilLaunch();
  const kicker =
    days > 0
      ? `J-${days} · 26 mai 2026 · AGPLv3`
      : "Lancement effectué · AGPLv3";
  const title = days > 0 ? "Bientôt libre, ensemble." : "Libre, ensemble.";
  const subtitle =
    days > 0
      ? "La brique humaine de l'écosystème cyber souverain français devient open source."
      : "Code complet, repo public, déploiement self-host en 10 minutes.";

  return renderOgCard({
    kicker,
    title,
    subtitle,
    bullets: ["⭐ Repo public", "🛠️ Self-host 10 min", "🇫🇷 Souverain"],
    glyph: days > 0 ? `J-${days}` : "✨",
    accentColor: "#2E8B57",
  });
}
