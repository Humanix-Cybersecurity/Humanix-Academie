// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/nis2 - posture NIS2 / ReCyF VIVANTE du tenant.
// Auth garantie par app/admin/layout.tsx. Objectifs 4 (formation) et 15
// (exercices) mesures automatiquement ; le reste est declare et persiste.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { computeTenantRecyf } from "@/lib/nis2/recyf-tenant";
import RecyfPostureBoard from "@/components/nis2/RecyfPostureBoard";

export const dynamic = "force-dynamic";

export default async function AdminNis2Page() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const data = await computeTenantRecyf(tenantId, { recordSnapshot: true });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <p className="text-xs uppercase tracking-widest font-bold text-accent-500 mb-1">
        Conformité
      </p>
      <h1 className="font-display text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-2">
        Ma posture NIS2 / ReCyF
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
        Ta situation sur les objectifs de sécurité du Référentiel Cyber France
        (ReCyF, ANSSI). Elle est <strong>vivante</strong> : ton score de
        formation et d&apos;exercices monte tout seul quand ton équipe agit.
      </p>

      {!data.hasAssessment && (
        <div className="rounded-2xl border-2 border-primary-200 dark:border-primary-900/40 bg-primary-50/50 dark:bg-primary-950/20 p-5 mb-6 text-center">
          <p className="text-gray-700 dark:text-gray-200 mb-3">
            Commence par ton auto-évaluation pour compléter le tableau (2
            objectifs sont déjà mesurés automatiquement).
          </p>
          <Link
            href="/admin/nis2/evaluer"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors"
          >
            Faire mon auto-évaluation →
          </Link>
        </div>
      )}

      <RecyfPostureBoard data={data} />

      {/* Actions */}
      <section className="rounded-2xl bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-950/40 dark:to-accent-950/40 border-2 border-primary-200 dark:border-primary-900/40 p-6 mt-8">
        <h2 className="font-display text-lg font-bold text-primary-500 dark:text-accent-300 mb-3">
          Faire monter le score
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/nis2/evaluer"
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            Mettre à jour l&apos;auto-évaluation
          </Link>
          <Link
            href="/admin/exercice-crise"
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            <span aria-hidden="true">🚨 </span>Lancer un exercice (objectif 15)
          </Link>
          <Link
            href="/admin/conformite-nis2"
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            <span aria-hidden="true">📋 </span>Pack NIS2 &amp; registres
          </Link>
        </div>
      </section>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic mt-6 max-w-2xl mx-auto leading-relaxed">
        Auto-évaluation indicative qui vous accompagne vers la conformité, sans
        la garantir. Le ReCyF est un document de travail de l&apos;ANSSI ; on ne
        parle pas de « conformité figée » mais d&apos;une démarche
        d&apos;amélioration.
      </p>
    </div>
  );
}
