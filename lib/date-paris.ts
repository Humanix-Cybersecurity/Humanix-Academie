// SPDX-License-Identifier: AGPL-3.0-or-later
// Dates affichees a l'HEURE DE PARIS, identiques ou qu'elles soient formatees.
//
// POURQUOI CE MODULE EXISTE
//
//   `new Date(iso).toLocaleString("fr-FR")` depend du fuseau du processus qui
//   l'execute. Dans un composant client, React l'execute deux fois : sur le
//   serveur (conteneur en UTC) puis dans le navigateur (Europe/Paris). Les
//   deux textes different d'une heure, React jette le HTML du serveur et
//   recommence (erreur d'hydratation #418). Constate le 2026-11-02 sur
//   /profil/securite : « Derniere connexion : 31/10/2026 13:12:52 » rendu par
//   le serveur, 14:12:52 dans le navigateur.
//
//   Ici le fuseau est fixe, Europe/Paris, comme pour les bornes de periode
//   (lib/periode.ts) et les factures. Le texte est assemble a partir des
//   champs numeriques (formatToParts) et non de format(), pour ne pas
//   dependre non plus des separateurs que chaque moteur ICU choisit.

const FORMAT = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type Champ = "year" | "month" | "day" | "hour" | "minute" | "second";
type Champs = Record<Champ, string>;

function champsParis(instant: Date | string): Champs | null {
  const d = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(d.getTime())) return null;
  const champs = {} as Champs;
  for (const p of FORMAT.formatToParts(d)) {
    if (p.type !== "literal") champs[p.type as Champ] = p.value;
  }
  // Minuit est sorti en « 24 » sur d'anciens moteurs malgre hourCycle.
  if (champs.hour === "24") champs.hour = "00";
  return champs;
}

/** « 31/10/2026 » : le jour civil a Paris. Chaine vide si la date est invalide. */
export function dateParis(instant: Date | string): string {
  const c = champsParis(instant);
  return c ? `${c.day}/${c.month}/${c.year}` : "";
}

/** « 31/10/2026 14:12:52 » : l'instant a l'heure de Paris. Chaine vide si invalide. */
export function dateHeureParis(instant: Date | string): string {
  const c = champsParis(instant);
  return c
    ? `${c.day}/${c.month}/${c.year} ${c.hour}:${c.minute}:${c.second}`
    : "";
}
