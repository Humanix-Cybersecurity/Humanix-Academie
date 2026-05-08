// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la sanitisation TTS.
// Critique : sanitizeForTTS est utilise pour calculer le hash de cache.
// Si f(f(x)) != f(x), le cache batch ne hit jamais le cache runtime.

import { describe, it, expect } from "vitest";
import { sanitizeForTTS } from "./sanitize";
import { segmentHash } from "./cache";
import { stripID3v2Header } from "./mistral";

describe("sanitizeForTTS - basics", () => {
  it("retourne une chaine vide pour une entree vide", () => {
    expect(sanitizeForTTS("")).toBe("");
    expect(sanitizeForTTS(null as unknown as string)).toBe("");
  });

  it("retire les ** gras **", () => {
    expect(sanitizeForTTS("Le mot **fort** ici.")).toBe("Le mot fort ici.");
  });

  it("retire les * italiques *", () => {
    expect(sanitizeForTTS("c'est *important* a savoir")).toBe(
      "c'est important a savoir",
    );
  });

  it("retire les `code inline`", () => {
    expect(sanitizeForTTS("utilise `npm run dev` pour lancer")).toBe(
      "utilise npm run dev pour lancer",
    );
  });

  it("retire les liens markdown en gardant le texte", () => {
    expect(sanitizeForTTS("voir [docs](https://x.com) pour plus")).toBe(
      "voir docs pour plus",
    );
  });

  it("retire les titres markdown", () => {
    expect(sanitizeForTTS("# Titre\n\nContenu")).toBe("Titre Contenu");
  });

  it("retire les listes", () => {
    expect(sanitizeForTTS("- item 1\n- item 2")).toBe("item 1 item 2");
  });

  it("retire les emojis", () => {
    expect(sanitizeForTTS("Hello 👋 monde 🌍 !")).toBe("Hello  monde  !".replace(/\s+/g, " "));
  });

  it("normalise les whitespaces", () => {
    expect(sanitizeForTTS("  trop    d'espaces  \n\n ici  ")).toBe(
      "trop d'espaces ici",
    );
  });

  it("preserve la ponctuation francaise", () => {
    const src = "« Vraiment ? Oui ! » dit-elle, etonnee.";
    expect(sanitizeForTTS(src)).toBe(src);
  });
});

describe("sanitizeForTTS - idempotence (critique pour le cache)", () => {
  const samples = [
    "",
    "texte simple",
    "**gras** et _italique_ et `code` et [lien](url)",
    "## Titre\n- item\n- item\n\nparagraphe avec espaces  multiples",
    "alert 🚨 phishing 📧 detecte !",
    "« Bonjour ; comment vas-tu ? Bien, et toi ? »",
  ];

  for (const sample of samples) {
    it(`f(f(x)) === f(x) pour: ${sample.slice(0, 40)}…`, () => {
      const once = sanitizeForTTS(sample);
      const twice = sanitizeForTTS(once);
      expect(twice).toBe(once);
    });
  }
});

describe("segmentHash - determinisme et collision-resistance", () => {
  it("retourne 64 chars hex", () => {
    expect(segmentHash("hello", "fr_marie_neutral")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("meme texte + meme voix => meme hash", () => {
    const h1 = segmentHash("Bonjour le monde.", "fr_marie_neutral");
    const h2 = segmentHash("Bonjour le monde.", "fr_marie_neutral");
    expect(h1).toBe(h2);
  });

  it("meme texte + voix differente => hashes differents", () => {
    const h1 = segmentHash("Bonjour", "fr_marie_neutral");
    const h2 = segmentHash("Bonjour", "fr_marie_angry");
    expect(h1).not.toBe(h2);
  });

  it("texte different + meme voix => hashes differents", () => {
    const h1 = segmentHash("Bonjour", "fr_marie_neutral");
    const h2 = segmentHash("Bonjour.", "fr_marie_neutral");
    expect(h1).not.toBe(h2);
  });

  it("hash batch == hash runtime apres sanitize commune", () => {
    // Simulation : le batch genere depuis le MDX brut, le runtime recoit
    // le meme texte source via TTSButton (qui envoie raw au serveur).
    // Apres sanitize commune, les deux doivent produire le meme hash.
    const mdxRaw = "Voici un module **important** sur la cyber.";
    const batchHash = segmentHash(sanitizeForTTS(mdxRaw), "fr_marie_neutral");
    const runtimeHash = segmentHash(sanitizeForTTS(mdxRaw), "fr_marie_neutral");
    expect(batchHash).toBe(runtimeHash);
  });
});

describe("stripID3v2Header - critique pour le concat MP3 multi-chunk", () => {
  // Construit un buffer ID3v2 minimal : "ID3" + version 4.0 + flags 0 + size 100
  // (synchsafe : 0,0,0,100) + 100 bytes de "tag data" + 4 bytes de "frames"
  function makeID3v2(tagSize: number, frameBytes: number[]): Buffer {
    const header = Buffer.from([
      0x49, 0x44, 0x33,                    // "ID3"
      0x04, 0x00,                          // version 4.0
      0x00,                                // flags
      0,                                   // size byte 1 (synchsafe)
      0,                                   // size byte 2
      (tagSize >> 7) & 0x7f,               // size byte 3
      tagSize & 0x7f,                      // size byte 4
    ]);
    const tagData = Buffer.alloc(tagSize, 0x00);
    const frames = Buffer.from(frameBytes);
    return Buffer.concat([header, tagData, frames]);
  }

  it("strip un buffer commencant par ID3v2", () => {
    // 100 bytes de tag + 4 bytes "frames" (juste des marqueurs)
    const buf = makeID3v2(100, [0xff, 0xfb, 0x90, 0x00]);
    const stripped = stripID3v2Header(buf);
    expect(stripped.length).toBe(4);
    expect(Array.from(stripped)).toEqual([0xff, 0xfb, 0x90, 0x00]);
  });

  it("retourne le buffer tel quel s'il ne commence PAS par ID3", () => {
    const buf = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x12, 0x34]);
    const out = stripID3v2Header(buf);
    expect(out).toBe(buf);
  });

  it("retourne tel quel un buffer trop court (< 10 bytes)", () => {
    const buf = Buffer.from([0x49, 0x44, 0x33]);
    const out = stripID3v2Header(buf);
    expect(out).toBe(buf);
  });

  it("decode correctement un synchsafe int sur les 4 octets", () => {
    // Un tag de 0x4000 = 16384 bytes : les 2 bytes hauts ne sont pas tous 0
    // synchsafe : 16384 = (1 << 14), repartis : 0,0,0x80? non, 1,0
    // Verifie : ((1) << 14) = 16384. Les bytes : 0,0,1<<7=non !
    // 16384 = 1*128*128 = (0x80 >> 0) << 14, donc bytes 6..9 = 0,0,1,0 ?
    // Reverse : (b6 << 21) | (b7 << 14) | (b8 << 7) | b9 = 16384
    //   b6=0, b7=1, b8=0, b9=0  ->  1 << 14 = 16384 ✓
    const header = Buffer.from([
      0x49, 0x44, 0x33, 0x04, 0x00, 0x00,
      0, 1, 0, 0,                        // size = 16384
    ]);
    const tagData = Buffer.alloc(16384, 0xaa);
    const frames = Buffer.from([0xff, 0xfb]);
    const buf = Buffer.concat([header, tagData, frames]);
    const stripped = stripID3v2Header(buf);
    expect(stripped.length).toBe(2);
  });
});
