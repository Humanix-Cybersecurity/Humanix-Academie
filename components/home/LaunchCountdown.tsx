// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Bandeau countdown du lancement OSS public (21 mai 2026).
// Server component : la date cible et le calcul de J-X sont
// recalcules a chaque request (mais la page est revalidate=3600 donc
// max 1h de drift, acceptable pour un countdown a la journee).
//
// Apres la date de launch : le bandeau bascule en "C'est arrive !"
// avec un CTA vers la GitHub Release.

import Link from "next/link";

// Date de launch (21 mai 2026, 09:00 Europe/Paris).
// UTC = 07:00 (DST ete = UTC+2).
const LAUNCH_DATE = new Date("2026-05-21T07:00:00Z");

function computeDaysToLaunch(): number {
  const now = Date.now();
  const target = LAUNCH_DATE.getTime();
  const msPerDay = 24 * 3600 * 1000;
  return Math.ceil((target - now) / msPerDay);
}

export default function LaunchCountdown() {
  const days = computeDaysToLaunch();

  // Apres la date : message different (et le bandeau peut etre
  // retire manuellement quelques jours plus tard).
  if (days <= 0) {
    return (
      <section
        aria-label="Lancement open source"
        className="bg-gradient-to-r from-emerald-500 via-accent-500 to-primary-500 text-white"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center gap-4 flex-wrap">
          <span className="text-2xl" aria-hidden="true">
            🎉
          </span>
          <p className="text-sm sm:text-base font-bold text-center">
            Humanix Académie est désormais open source sous AGPLv3 !
          </p>
          <Link
            href="https://github.com/Humanix-Cybersecurity/Humanix-Academie/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm bg-white text-primary-600 font-bold px-4 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            Voir la release →
          </Link>
        </div>
      </section>
    );
  }

  // Pre-launch : countdown
  const label = days === 1 ? "jour" : "jours";
  return (
    <section
      aria-label="Lancement open source à venir"
      className="bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 text-white"
    >
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 sm:gap-4 flex-wrap text-sm">
        <span className="text-lg" aria-hidden="true">
          🚀
        </span>
        <p className="font-semibold text-center">
          <span className="font-bold tabular-nums">J-{days}</span> avant
          l&apos;ouverture du dépôt public AGPLv3
        </p>
        <span className="hidden sm:inline opacity-60" aria-hidden="true">
          ·
        </span>
        <span className="hidden sm:inline text-xs opacity-90">
          Jeudi 21 mai 2026 · 9 h
        </span>
        <Link
          href="/manifeste"
          className="text-xs bg-white/15 hover:bg-white/25 border border-white/30 px-3 py-1 rounded-full transition-colors"
        >
          Le manifeste
        </Link>
      </div>
    </section>
  );
}
