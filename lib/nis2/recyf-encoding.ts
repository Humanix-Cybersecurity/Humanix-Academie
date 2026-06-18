// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Encodage / decodage stateless des reponses du diagnostic ReCyF dans
// l'URL (base64url). Rien n'est stocke cote serveur.
//
// Format : base64url(JSON.stringify({ p, c?, a }))
//   p : profil "EI" | "EE"
//   c : nom organisation optionnel
//   a : map { numObjectif -> "o" (oui) | "p" (en_partie) | "n" (non) }

import { RECYF_BY_ID, type RecyfProfil } from "./recyf";
import { sanitizeAnswers, type RecyfAnswer, type RecyfAnswers } from "./recyf-scoring";

const TO_CHAR: Record<RecyfAnswer, "o" | "p" | "n"> = {
  oui: "o",
  en_partie: "p",
  non: "n",
};
const FROM_CHAR: Record<string, RecyfAnswer> = {
  o: "oui",
  p: "en_partie",
  n: "non",
};

function objNumToId(num: string): string | null {
  const id = `obj-${num}`;
  return RECYF_BY_ID[id] ? id : null;
}

export function encodeRecyf(
  profil: RecyfProfil,
  answers: RecyfAnswers,
  companyName: string | null,
): string {
  const a: Record<string, "o" | "p" | "n"> = {};
  for (const [id, val] of Object.entries(answers)) {
    const num = id.replace("obj-", "");
    a[num] = TO_CHAR[val];
  }
  const payload = JSON.stringify({
    p: profil,
    c: companyName || undefined,
    a,
  });
  return Buffer.from(payload, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeRecyf(encoded: string): {
  profil: RecyfProfil;
  answers: RecyfAnswers;
  companyName: string | null;
} | null {
  try {
    let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const json = Buffer.from(b64, "base64").toString("utf-8");
    const parsed = JSON.parse(json) as {
      p?: string;
      c?: string;
      a?: Record<string, string>;
    };
    const profil: RecyfProfil = parsed.p === "EE" ? "EE" : "EI";
    const answers: RecyfAnswers = {};
    for (const [num, ch] of Object.entries(parsed.a ?? {})) {
      const id = objNumToId(num);
      const ans = FROM_CHAR[ch];
      if (id && ans) answers[id] = ans;
    }
    return {
      profil,
      answers: sanitizeAnswers(answers),
      companyName: parsed.c ?? null,
    };
  } catch {
    return null;
  }
}
