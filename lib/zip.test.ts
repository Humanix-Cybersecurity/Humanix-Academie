// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de l'ecriture ZIP.
//
// Le format est verifie pour de vrai par scripts/ -- ici on protege les
// invariants qui se cassent en silence : le CRC, les limites 32 bits, et la
// normalisation des noms.

import { describe, it, expect } from "vitest";
import { construireZip, crc32, nomSur } from "./zip";

const enc = new TextEncoder();

describe("crc32", () => {
  // Vecteur de test canonique du CRC-32 (IEEE 802.3).
  it("« 123456789 » donne 0xCBF43926", () => {
    expect(crc32(enc.encode("123456789")).toString(16).toUpperCase()).toBe(
      "CBF43926",
    );
  });

  it("chaine vide donne 0", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it("un octet different change la somme", () => {
    expect(crc32(enc.encode("abc"))).not.toBe(crc32(enc.encode("abd")));
  });
});

describe("nomSur", () => {
  // L'unzip d'Info-ZIP (macOS) echoue a creer un fichier au nom accentue,
  // meme si l'archive est valide. On retire la classe de probleme.
  it("retire les accents", () => {
    expect(nomSur("Été & Ça.txt")).toBe("Ete_Ca.txt");
  });

  it("preserve les separateurs de dossier et les points", () => {
    expect(nomSur("factures/FA-2026-0001.pdf")).toBe(
      "factures/FA-2026-0001.pdf",
    );
  });

  it("remplace tout ce qui n'est pas ASCII sur", () => {
    expect(nomSur("a b*c?d.txt")).toBe("a_b_c_d.txt");
  });

  it("ne laisse ni tiret bas en tete ni en fin", () => {
    expect(nomSur(" bizarre ")).toBe("bizarre");
  });
});

describe("construireZip", () => {
  it("commence par la signature PK\\x03\\x04", () => {
    const z = construireZip([{ nom: "a.txt", contenu: enc.encode("x") }]);
    expect([...z.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it("finit par l'enregistrement de fin de repertoire central", () => {
    const z = construireZip([{ nom: "a.txt", contenu: enc.encode("x") }]);
    const fin = z.subarray(z.length - 22, z.length - 18);
    expect([...fin]).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  it("annonce le bon nombre de fichiers", () => {
    const z = construireZip([
      { nom: "a.txt", contenu: enc.encode("x") },
      { nom: "b.txt", contenu: enc.encode("y") },
      { nom: "c.txt", contenu: enc.encode("z") },
    ]);
    // Champ « nombre d'entrees » de l'enregistrement de fin, offset -12.
    const n = z[z.length - 12] | (z[z.length - 11] << 8);
    expect(n).toBe(3);
  });

  it("REFUSE un nom en double plutot que de produire une archive ambigue", () => {
    expect(() =>
      construireZip([
        { nom: "a.txt", contenu: enc.encode("x") },
        { nom: "a.txt", contenu: enc.encode("y") },
      ]),
    ).toThrow(/double/);
  });

  it("REFUSE au-dela de la limite 32 bits plutot que de corrompre", () => {
    const trop = Array.from({ length: 65_536 }, (_, i) => ({
      nom: `f${i}.txt`,
      contenu: new Uint8Array(0),
    }));
    expect(() => construireZip(trop)).toThrow(/ZIP64/);
  });

  it("accepte une archive vide", () => {
    const z = construireZip([]);
    expect(z.length).toBe(22);
    expect([...z.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  // L'horodatage MS-DOS est en heure locale : un export a 23 h 30 UTC ne doit
  // pas s'afficher a la veille dans l'explorateur de fichiers.
  it("horodate en heure de Paris, pas en UTC", () => {
    const z = construireZip(
      [{ nom: "a.txt", contenu: enc.encode("x") }],
      new Date("2026-08-20T21:30:00Z"),
    );
    // Champs heure/date MS-DOS de l'en-tete local : offsets 10 et 12.
    const heure = z[10] | (z[11] << 8);
    expect(heure >>> 11).toBe(23); // 21 h UTC = 23 h a Paris en aout
  });
});
