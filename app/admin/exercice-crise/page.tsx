// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/exercice-crise - lance et retrouve les exercices de crise en direct.
// Auth garantie par app/admin/layout.tsx (defense-in-depth).

import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DRILL_SCENARIOS } from "@/lib/drill/scenarios";
import CreateDrillPanel from "@/components/drill/CreateDrillPanel";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  LOBBY: "Salle d'attente",
  RUNNING: "En cours",
  ENDED: "Terminé",
};

export default async function AdminCrisisDrillPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const recent = await db.crisisExercise.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      code: true,
      scenarioId: true,
      status: true,
      createdAt: true,
      _count: { select: { participants: true } },
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <p className="text-xs uppercase tracking-widest font-bold text-accent-500 mb-1">
        Sensibilisation
      </p>
      <h1 className="font-display text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-2">
        Exercice de crise en direct
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
        Un drill cyber collectif : toute l&apos;équipe traverse la même crise en
        même temps, vote manche après manche, et voit ses réflexes en direct. En
        15 minutes, une culture de crise qui marque. Coche aussi l&apos;objectif
        15 de ReCyF (exercices).
      </p>

      {/* Scenarios + format */}
      <div className="mb-10">
        <CreateDrillPanel
          scenarios={DRILL_SCENARIOS.map((sc) => ({
            id: sc.id,
            title: sc.title,
            rounds: sc.rounds.length,
            durationMin: sc.durationMin,
          }))}
        />
      </div>

      {/* Sessions recentes */}
      {recent.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold text-primary-500 dark:text-accent-300 mb-3">
            Sessions récentes
          </h2>
          <ul className="space-y-2 list-none p-0">
            {recent.map((ex) => (
              <li key={ex.id}>
                <Link
                  href={`/admin/exercice-crise/${ex.id}`}
                  className="flex items-center gap-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 p-3 transition-colors"
                >
                  <span className="font-mono text-lg font-bold tracking-widest text-primary-600 dark:text-accent-200">
                    {ex.code}
                  </span>
                  <span className="flex-1 text-sm text-gray-600 dark:text-gray-300">
                    {ex._count.participants} participant
                    {ex._count.participants > 1 ? "s" : ""}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                    {STATUS_LABEL[ex.status] ?? ex.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
