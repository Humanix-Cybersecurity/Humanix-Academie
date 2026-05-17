"use server";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server action : calcule le diagnostic NIS2 a partir des reponses
// utilisateur soumises depuis /diagnostic-nis2/page.tsx.
//
// Pas de persistance BDD pour V1 — le score + email transitent en
// query params encodes (base64) jusqu'a la page resultat. Pas de cookie,
// pas de session : 100 % stateless, RGPD-friendly (rien stocke sauf si
// l'utilisateur demande explicitement a recevoir le PDF par mail).

import { z } from "zod";
import { redirect } from "next/navigation";
import {
  computeNis2Diagnostic,
  type Nis2Answer,
} from "@/lib/nis2/scoring";

const AnswerSchema = z.enum(["oui", "non", "ne_sait_pas"]);

/**
 * Encode les reponses en query param compact pour la redirection.
 * Format : { e: email?, c: companyName?, a: { qid: "o" | "n" | "u" } }
 * Compresse en JSON puis base64url.
 */
function encodeAnswers(
  answers: Record<string, Nis2Answer>,
  email: string | null,
  companyName: string | null,
): string {
  // Compresse "oui"/"non"/"ne_sait_pas" en 1 char pour reduire l'URL.
  const compactA: Record<string, "o" | "n" | "u"> = {};
  for (const [k, v] of Object.entries(answers)) {
    compactA[k] = v === "oui" ? "o" : v === "non" ? "n" : "u";
  }
  const payload = JSON.stringify({
    e: email || undefined,
    c: companyName || undefined,
    a: compactA,
  });
  // base64url (RFC 4648) — safe en URL
  return Buffer.from(payload, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function submitDiagnosticNis2(formData: FormData) {
  // Parse identite (optionnelle pour V1 : on ne force pas l'email)
  const email = formData.get("email")?.toString().trim().toLowerCase() || null;
  const companyName =
    formData.get("companyName")?.toString().trim() || null;

  // Parse les 30 reponses
  const answers: Record<string, Nis2Answer> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("q_")) {
      const qid = key.slice(2);
      const parsed = AnswerSchema.safeParse(value);
      if (parsed.success) {
        answers[qid] = parsed.data;
      }
    }
  }

  // Compute pour validation cote serveur (on ne fait pas confiance au client)
  computeNis2Diagnostic(answers);

  // Redirect vers la page resultat avec les donnees encodees en query
  const data = encodeAnswers(answers, email, companyName);
  redirect(`/diagnostic-nis2/resultat?d=${data}`);
}

/**
 * Decode le query param de retour.
 * Utilise cote server component dans la page resultat.
 */
export function decodeAnswers(encoded: string): {
  answers: Record<string, Nis2Answer>;
  email: string | null;
  companyName: string | null;
} | null {
  try {
    // Reverse base64url
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
