// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/exercice-crise/[id] - cockpit hote d'une session (pilotage live).

import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getScenario } from "@/lib/drill/scenarios";
import DrillCockpit from "@/components/drill/DrillCockpit";

export const dynamic = "force-dynamic";

export default async function CrisisCockpitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const ex = await db.crisisExercise.findFirst({
    where: { id, tenantId },
    select: { id: true, code: true, scenarioId: true },
  });
  if (!ex) notFound();
  const scenario = getScenario(ex.scenarioId);
  if (!scenario) notFound();

  return (
    <div className="px-4 py-8">
      <div className="max-w-3xl mx-auto mb-3">
        <Link
          href="/admin/exercice-crise"
          className="text-sm text-accent-500 hover:text-accent-600 underline-offset-4 hover:underline"
        >
          ← Exercices de crise
        </Link>
      </div>
      <DrillCockpit
        exerciseId={ex.id}
        code={ex.code}
        scenarioTitle={scenario.title}
      />
    </div>
  );
}
