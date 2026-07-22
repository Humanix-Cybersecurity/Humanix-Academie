"use server";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Persiste l'auto-evaluation ReCyF d'un tenant (posture in-app). Le diagnostic
// public est stateless ; ici on garde la reponse et on la fait vivre.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { objectifsForProfil, type RecyfProfil } from "@/lib/nis2/recyf";
import {
  sanitizeAnswers,
  type RecyfAnswer,
  type RecyfAnswers,
} from "@/lib/nis2/recyf-scoring";

function asAnswer(v: string | undefined): RecyfAnswer | null {
  if (v === "oui" || v === "en_partie" || v === "non") return v;
  return null;
}

export async function saveRecyfAssessment(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId;

  const profil: RecyfProfil =
    formData.get("profil")?.toString() === "EE" ? "EE" : "EI";

  const answers: RecyfAnswers = {};
  for (const o of objectifsForProfil(profil)) {
    const a = asAnswer(formData.get(`q_${o.num}`)?.toString());
    if (a) answers[o.id] = a;
  }

  const clean = sanitizeAnswers(answers);
  await db.recyfAssessment.upsert({
    where: { tenantId },
    create: { tenantId, profil, answers: clean },
    update: { profil, answers: clean },
  });

  redirect("/admin/nis2");
}
