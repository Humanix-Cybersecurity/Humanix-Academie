// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/nis2/evaluer - auto-evaluation ReCyF persistee (posture in-app).
// Reutilise le formulaire du diagnostic public, mais enregistre la reponse
// (upsert RecyfAssessment) au lieu d'encoder dans l'URL.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { RecyfProfil } from "@/lib/nis2/recyf";
import DiagnosticRecyfForm from "@/components/nis2/DiagnosticRecyfForm";
import { saveRecyfAssessment } from "../actions";

export const dynamic = "force-dynamic";

export default async function EvaluerRecyfPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const existing = await db.recyfAssessment.findUnique({ where: { tenantId } });
  const initialProfil: RecyfProfil = existing?.profil === "EE" ? "EE" : "EI";

  const stored = (existing?.answers ?? {}) as Record<string, string>;
  const initialAnswers: Record<number, "oui" | "en_partie" | "non"> = {};
  for (const [k, v] of Object.entries(stored)) {
    const num = Number(k.replace("obj-", ""));
    if (
      Number.isFinite(num) &&
      (v === "oui" || v === "en_partie" || v === "non")
    ) {
      initialAnswers[num] = v;
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/admin/nis2"
        className="text-sm text-accent-500 hover:text-accent-600 underline-offset-4 hover:underline mb-3 inline-block"
      >
        ← Ma posture
      </Link>
      <h1 className="font-display text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-2">
        Mon auto-évaluation ReCyF
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
        Réponds honnêtement, objectif par objectif. Bon à savoir :
        l&apos;objectif 4 (formation) et l&apos;objectif 15 (exercices) sont{" "}
        <strong>mesurés automatiquement</strong> depuis ton activité, tes
        réponses sur ces deux-là sont donc indicatives.
      </p>

      <DiagnosticRecyfForm
        action={saveRecyfAssessment}
        submitLabel="Enregistrer ma posture →"
        initialProfil={initialProfil}
        initialAnswers={initialAnswers}
      />
    </div>
  );
}
