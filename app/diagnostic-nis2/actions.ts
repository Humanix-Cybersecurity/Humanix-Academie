"use server";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server action : encode le diagnostic ReCyF soumis depuis le formulaire
// et redirige vers la page resultat.
//
// 100 % stateless, RGPD-friendly : profil + reponses transitent en query
// param encode (base64url). Rien n'est stocke (pas de cookie, pas de BDD).
//
// CONTRAINTE Next.js 16 + Turbopack : un fichier "use server" ne peut
// exporter QUE des fonctions async. Les helpers sync d'encodage vivent
// dans lib/nis2/recyf-encoding.

import { redirect } from "next/navigation";
import { objectifsForProfil, type RecyfProfil } from "@/lib/nis2/recyf";
import {
  sanitizeAnswers,
  type RecyfAnswer,
  type RecyfAnswers,
} from "@/lib/nis2/recyf-scoring";
import { encodeRecyf } from "@/lib/nis2/recyf-encoding";

function asAnswer(v: string | undefined): RecyfAnswer | null {
  if (v === "oui" || v === "en_partie" || v === "non") return v;
  return null;
}

export async function submitDiagnosticRecyf(formData: FormData) {
  const profil: RecyfProfil =
    formData.get("profil")?.toString() === "EE" ? "EE" : "EI";
  const companyName =
    formData.get("companyName")?.toString().trim() || null;

  // On ne lit que les objectifs applicables au profil declare.
  const answers: RecyfAnswers = {};
  for (const o of objectifsForProfil(profil)) {
    const a = asAnswer(formData.get(`q_${o.num}`)?.toString());
    if (a) answers[o.id] = a;
  }

  const data = encodeRecyf(profil, sanitizeAnswers(answers), companyName);
  redirect(`/diagnostic-nis2/resultat?d=${data}`);
}
