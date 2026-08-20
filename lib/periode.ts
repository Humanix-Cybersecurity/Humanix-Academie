// SPDX-License-Identifier: AGPL-3.0-or-later
// Bornes de periode exprimees en HEURE DE PARIS.
//
// POURQUOI CE MODULE EXISTE
//
//   Interpreter « du 1er au 31 aout » en UTC decale les bornes de une ou deux
//   heures selon la saison. Sur un export comptable, ca fait basculer une
//   facture d'une periode a l'autre : une vente du 1er aout a 00 h 30 a Paris
//   sort de l'export d'aout, et une du 1er septembre a 01 h 00 y entre.
//
//   Constate en construisant l'export des factures : `fin=2026-08-31` produisait
//   une borne au 2026-09-01 01 h 59 heure de Paris.
//
//   Le decalage n'est pas constant -- +1 en hiver, +2 en ete -- donc on ne
//   peut pas le coder en dur. On demande a Intl.

/** Decalage de Paris par rapport a UTC, en minutes, a un instant donne. */
export function decalageParisMinutes(instant: Date): number {
  const partie = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "longOffset",
  })
    .formatToParts(instant)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(partie ?? "");
  if (!m) return 0;
  const signe = m[1] === "-" ? -1 : 1;
  return signe * (Number(m[2]) * 60 + Number(m[3]));
}

/**
 * Convertit une date civile « AAAA-MM-JJ » en instant UTC, a l'heure de Paris.
 *
 * @param finDeJournee true pour 23:59:59.999 au lieu de 00:00:00.000
 * @returns null si la chaine n'est pas une date exploitable
 */
export function instantParis(
  dateCivile: string,
  finDeJournee = false,
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateCivile)) return null;
  const heure = finDeJournee ? "23:59:59.999" : "00:00:00.000";
  // Premiere approximation : on lit la date comme si Paris etait UTC.
  const approx = new Date(`${dateCivile}T${heure}Z`);
  if (Number.isNaN(approx.getTime())) return null;
  // On retire le decalage. Une seconde passe rattrape le cas ou la borne
  // tombe le jour meme d'un changement d'heure -- le decalage lu sur
  // l'approximation peut alors differer de celui de l'instant reel.
  let resultat = new Date(approx.getTime() - decalageParisMinutes(approx) * 60_000);
  const decalageReel = decalageParisMinutes(resultat);
  resultat = new Date(approx.getTime() - decalageReel * 60_000);
  return resultat;
}
