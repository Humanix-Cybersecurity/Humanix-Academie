// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/phishing/vulnerable-users — Tableau des utilisateurs avec leur
// profil de vulnerabilite phishing genere par Mistral.
//
// CONTEXT (Phase 5c Phishing Engine v2, mai 2026) :
//   Le RSSI veut voir d'un coup d'oeil "qui clique trop, qui signale, qui
//   est a risque". Le score numerique de lib/risk-score.ts est utile mais
//   pas explicatif. Cette page complete avec un PROFIL NARRATIF Mistral
//   par user des qu'on clique sur "Analyser" (a la demande, pour eviter
//   de cramer des tokens API pour 200 users).
//
// PERFORMANCE :
//   On charge la liste des users SANS profil IA (stats only). L'admin clique
//   sur "Analyser" pour chaque ligne -> appel Mistral a la demande. Une
//   future optim : cron pre-calc 1x/semaine + cache 7j.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";
import PlanGate from "@/components/PlanGate";
import VulnerabilityRow from "./VulnerabilityRow";

export const dynamic = "force-dynamic";

export default async function VulnerableUsersPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;
  const plan = await getTenantPlan(tenantId);

  if (!planHasFeature(plan, "phishing")) {
    return (
      <>
        <AdminPageHeader
          title="Vulnerabilites phishing"
          icon="🎯"
          description="Profil IA de chaque apprenant base sur ses interactions phishing simulees."
        />
        <PlanGate
          feature="phishing"
          currentPlan={plan}
          requiredPlan={FEATURE_MIN_PLAN.phishing}
        />
      </>
    );
  }

  // Charge les users du tenant + leurs stats agregees phishing 180j
  const ninetyDaysAgo = new Date(Date.now() - 180 * 24 * 3600 * 1000);
  const users = await db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["LEARNER", "MANAGER"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      service: true,
      role: true,
      phishingResults: {
        where: { sentAt: { gte: ninetyDaysAgo } },
        select: {
          openedAt: true,
          clickedAt: true,
          submittedAt: true,
          reportedAt: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Tri : on met en premier les users avec le plus de signaux a risque
  // (submissions > clics > opens), pour que l'admin voie tout de suite les
  // cas qui meritent un debrief.
  const sorted = users
    .map((u) => {
      const submitted = u.phishingResults.filter(
        (r) => r.submittedAt !== null,
      ).length;
      const clicked = u.phishingResults.filter((r) => r.clickedAt !== null)
        .length;
      const opened = u.phishingResults.filter((r) => r.openedAt !== null).length;
      const reported = u.phishingResults.filter(
        (r) => r.reportedAt !== null,
      ).length;
      const total = u.phishingResults.length;
      const riskScore = submitted * 10 + clicked * 3 - reported * 2;
      return { ...u, submitted, clicked, opened, reported, total, riskScore };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/admin/phishing"
          className="text-sm text-gray-500 hover:text-accent-500"
        >
          ← Toutes les campagnes
        </Link>
      </div>
      <AdminPageHeader
        title="Vulnerabilites phishing"
        icon="🎯"
        description="Profil IA Mistral par apprenant sur 180 jours d'interactions avec les simulations. Clique sur 'Analyser' pour generer un narratif personnalise."
      />

      <AdminSection title={`${sorted.length} apprenant${sorted.length > 1 ? "s" : ""} actif${sorted.length > 1 ? "s" : ""} avec historique phishing`}>
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun apprenant avec interactions phishing sur les 180 derniers
            jours. Lance une campagne baseline pour generer des donnees.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Apprenant</th>
                  <th className="px-3 py-2 font-semibold">Service</th>
                  <th className="px-3 py-2 font-semibold text-right tabular-nums">
                    Reçus
                  </th>
                  <th className="px-3 py-2 font-semibold text-right tabular-nums">
                    Ouverts
                  </th>
                  <th className="px-3 py-2 font-semibold text-right tabular-nums">
                    Cliques
                  </th>
                  <th className="px-3 py-2 font-semibold text-right tabular-nums">
                    Soumis
                  </th>
                  <th className="px-3 py-2 font-semibold text-right tabular-nums">
                    Signales
                  </th>
                  <th className="px-3 py-2 font-semibold">Profil IA</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u) => (
                  <VulnerabilityRow
                    key={u.id}
                    userId={u.id}
                    name={u.name ?? u.email}
                    email={u.email}
                    service={u.service ?? "—"}
                    stats={{
                      total: u.total,
                      opened: u.opened,
                      clicked: u.clicked,
                      submitted: u.submitted,
                      reported: u.reported,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </>
  );
}
