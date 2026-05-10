// SPDX-License-Identifier: AGPL-3.0-or-later
// Calcul du streak : nombre de jours consecutifs avec au moins 1 episode
// complete, en remontant a partir d'aujourd'hui (ou hier si pas
// d'activite aujourd'hui — le streak ne se brise pas avant minuit J+1).

export function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(
    dates.map((d) => {
      const dd = new Date(d);
      dd.setHours(0, 0, 0, 0);
      return dd.getTime();
    }),
  );
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = today.getTime();
  const ONE_DAY = 24 * 3600 * 1000;
  if (!days.has(cursor)) cursor -= ONE_DAY;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= ONE_DAY;
  }
  return streak;
}
