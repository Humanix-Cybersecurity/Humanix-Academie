// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helpers d'encodage / decodage des reponses du diagnostic NIS2 dans
// l'URL (base64url stateless).
//
// VIT DANS UN FICHIER SEPARE de actions.ts car :
// 1. actions.ts est en "use server" (Next.js 16 + Turbopack) → ne peut
//    exporter QUE des fonctions async (limitation framework).
// 2. encodeAnswers / decodeAnswers sont synchrones et utiles autant
//    cote server action que cote page resultat (server component).
//
// Format encode : base64url(JSON.stringify({ e?, c?, a: { qid: "o"|"n"|"u" }}))
//   - e : email optionnel (si l'user veut le rapport par mail)
//   - c : nom organisation optionnel
//   - a : map { question_id -> "o" (oui) | "n" (non) | "u" (ne_sait_pas) }
//
// La compression 1-char par reponse permet de garder l'URL sous la
// limite des 2000 chars meme avec 30 questions.

import type { Nis2Answer } from "@/lib/nis2/scoring";

/**
 * Encode les reponses + identite en query param compact (base64url).
 */
export function encodeAnswers(
  answers: Record<string, Nis2Answer>,
  email: string | null,
  companyName: string | null,
): string {
  const compactA: Record<string, "o" | "n" | "u"> = {};
  for (const [k, v] of Object.entries(answers)) {
    compactA[k] = v === "oui" ? "o" : v === "non" ? "n" : "u";
  }
  const payload = JSON.stringify({
    e: email || undefined,
    c: companyName || undefined,
    a: compactA,
  });
  return Buffer.from(payload, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decode le query param `?d=...` en reponses + identite.
 * Retourne null si le payload est invalide (URL bidouillee ou erreur
 * d'encodage). La page resultat doit gerer ce cas (redirect vers le
 * wizard).
 */
export function decodeAnswers(encoded: string): {
  answers: Record<string, Nis2Answer>;
  email: string | null;
  companyName: string | null;
} | null {
  try {
    let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const json = Buffer.from(b64, "base64").toString("utf-8");
    const parsed = JSON.parse(json) as {
      e?: string;
      c?: string;
      a: Record<string, "o" | "n" | "u">;
    };
    const answers: Record<string, Nis2Answer> = {};
    for (const [k, v] of Object.entries(parsed.a)) {
      answers[k] = v === "o" ? "oui" : v === "n" ? "non" : "ne_sait_pas";
    }
    return {
      answers,
      email: parsed.e ?? null,
      companyName: parsed.c ?? null,
    };
  } catch {
    return null;
  }
}
