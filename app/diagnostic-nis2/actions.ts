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
//
// CONTRAINTE Next.js 16 + Turbopack : un fichier "use server" ne peut
// exporter QUE des fonctions async. Les helpers sync `encodeAnswers` /
// `decodeAnswers` vivent dans `./encoding.ts`.

import { z } from "zod";
import { redirect } from "next/navigation";
import {
  computeNis2Diagnostic,
  type Nis2Answer,
} from "@/lib/nis2/scoring";
import { encodeAnswers } from "./encoding";

const AnswerSchema = z.enum(["oui", "non", "ne_sait_pas"]);

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
