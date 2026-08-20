// SPDX-License-Identifier: AGPL-3.0-or-later
// Ecriture d'archives ZIP, sans dependance.
//
// POURQUOI PAS UNE BIBLIOTHEQUE
//
//   Le format ZIP « stored » (sans compression) tient en une centaine de
//   lignes, et ce qu'on y met est deja compresse : des PDF et du XML court.
//   Une dependance de plus apporterait ici de la surface d'attaque et une
//   quarantaine npm a gerer, pour un gain nul en taille.
//
// CE QUI EST IMPLEMENTE
//
//   ZIP 32 bits, methode 0 (stored), noms de fichiers en UTF-8 (bit 11 du
//   drapeau general). Suffisant pour un export de factures : quelques
//   dizaines de fichiers, bien en deca des limites 32 bits.
//
//   PAS de ZIP64 : au-dela de 4 Go d'archive ou 65 535 fichiers, il faudrait
//   l'ajouter. `construireZip` refuse explicitement plutot que de produire
//   une archive silencieusement corrompue.

const TABLE_CRC32 = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(donnees: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < donnees.length; i++) {
    c = TABLE_CRC32[(c ^ donnees[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Normalise un nom de fichier pour l'archive : ASCII uniquement.
 *
 * POURQUOI, ALORS QUE LE FORMAT SUPPORTE L'UTF-8
 *
 *   L'archive produite avec des noms accentues est valide -- Python la lit
 *   sans broncher -- mais l'`unzip` d'Info-ZIP, celui livre avec macOS,
 *   echoue a creer le fichier : « probably truncated », et le fichier
 *   n'apparait pas. Constate en extrayant « Été & Ça.txt ».
 *
 *   Un export comptable doit s'ouvrir avec l'outil que la personne a sous la
 *   main, pas avec celui qu'on aurait choisi. On retire donc les accents
 *   plutot que de parier sur le decompresseur d'en face.
 */
export function nomSur(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._/-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export type FichierZip = {
  /** Chemin dans l'archive. Les `/` creent des dossiers. */
  nom: string;
  contenu: Uint8Array;
};

/** Limites du ZIP 32 bits. Au-dela il faudrait ZIP64. */
const MAX_FICHIERS = 65_535;
const MAX_OCTETS = 0xffffffff;

function ecrire16(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff];
}
function ecrire32(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
}

/**
 * Horodatage MS-DOS (deux mots de 16 bits), en heure de PARIS.
 *
 * Meme raison que pour les factures : un export fait a 23 h 30 UTC ne doit
 * pas afficher la veille dans l'explorateur de fichiers.
 */
function horodatageDos(d: Date): { heure: number; date: number } {
  const p = new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Paris",
  }).formatToParts(d);
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  const annee = Math.max(1980, n("year"));
  return {
    heure: (n("hour") << 11) | (n("minute") << 5) | (n("second") >> 1),
    date: ((annee - 1980) << 9) | (n("month") << 5) | n("day"),
  };
}

export function construireZip(
  fichiers: FichierZip[],
  horodate: Date = new Date(),
): Uint8Array {
  if (fichiers.length > MAX_FICHIERS) {
    throw new Error(
      `archive trop grande : ${fichiers.length} fichiers, maximum ${MAX_FICHIERS} sans ZIP64`,
    );
  }
  const noms = new Set<string>();
  for (const f of fichiers) {
    if (noms.has(f.nom)) {
      throw new Error(`nom en double dans l'archive : ${f.nom}`);
    }
    noms.add(f.nom);
  }

  const { heure, date } = horodatageDos(horodate);
  const encodeur = new TextEncoder();
  const morceaux: number[][] = [];
  const central: number[][] = [];
  let position = 0;

  for (const f of fichiers) {
    const nom = Array.from(encodeur.encode(f.nom));
    const somme = crc32(f.contenu);
    const taille = f.contenu.length;

    // En-tete local. Drapeau 0x0800 : le nom est en UTF-8.
    const entete = [
      ...ecrire32(0x04034b50),
      ...ecrire16(20), // version minimale
      ...ecrire16(0x0800),
      ...ecrire16(0), // methode 0 : stored
      ...ecrire16(heure),
      ...ecrire16(date),
      ...ecrire32(somme),
      ...ecrire32(taille),
      ...ecrire32(taille),
      ...ecrire16(nom.length),
      ...ecrire16(0),
      ...nom,
    ];
    morceaux.push(entete, Array.from(f.contenu));

    central.push([
      ...ecrire32(0x02014b50),
      ...ecrire16(20), // version d'ecriture
      ...ecrire16(20), // version minimale
      ...ecrire16(0x0800),
      ...ecrire16(0),
      ...ecrire16(heure),
      ...ecrire16(date),
      ...ecrire32(somme),
      ...ecrire32(taille),
      ...ecrire32(taille),
      ...ecrire16(nom.length),
      ...ecrire16(0), // extra
      ...ecrire16(0), // commentaire
      ...ecrire16(0), // numero de disque
      ...ecrire16(0), // attributs internes
      ...ecrire32(0), // attributs externes
      ...ecrire32(position),
      ...nom,
    ]);
    position += entete.length + taille;
    if (position > MAX_OCTETS) {
      throw new Error("archive trop grande : plus de 4 Go, ZIP64 requis");
    }
  }

  const debutCentral = position;
  const tailleCentral = central.reduce((n, c) => n + c.length, 0);
  const fin = [
    ...ecrire32(0x06054b50),
    ...ecrire16(0),
    ...ecrire16(0),
    ...ecrire16(fichiers.length),
    ...ecrire16(fichiers.length),
    ...ecrire32(tailleCentral),
    ...ecrire32(debutCentral),
    ...ecrire16(0),
  ];

  const total = position + tailleCentral + fin.length;
  const sortie = new Uint8Array(total);
  let i = 0;
  for (const m of [...morceaux, ...central, fin]) {
    sortie.set(m instanceof Uint8Array ? m : Uint8Array.from(m), i);
    i += m.length;
  }
  return sortie;
}
