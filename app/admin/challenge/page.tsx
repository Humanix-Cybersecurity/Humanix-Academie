// SPDX-License-Identifier: AGPL-3.0-or-later
// /admin/challenge - Cyber-Challenges (gate Pro+).
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveChallenge, getChallengeRanking } from "@/lib/challenge";
import StartChallengeForm from "@/components/StartChallengeForm";
import StopChallengeButton from "@/components/StopChallengeButton";
import PlanGate from "@/components/PlanGate";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import StatusBadge from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminChallengePage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const plan = await getTenantPlan(tenantId);
  if (!planHasFeature(plan, "challenges", session?.user?.role)) {
    return (
      <>
        <AdminPageHeader
          title="Cyber-Challenges"
          description="Compétitions inter-services pour booster l'engagement de votre équipe."
        />
        <PlanGate
          feature="challenges"
          currentPlan={plan}
          requiredPlan={FEATURE_MIN_PLAN.challenges}
        />
      </>
    );
  }

  const active = await getActiveChallenge(tenantId);
  const ranking = active
    ? await getChallengeRanking(tenantId, active.startDate, active.endDate)
    : [];
  const pastChallenges = await db.teamChallenge.findMany({
    where: { tenantId, isActive: false },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <>
      <AdminPageHeader
        title="Cyber-Challenges"
        description="Active un classement temporaire entre les services. Tes équipes vont s'affronter avec bienveillance sur les XP gagnés pendant la période."
      />

      <div className="space-y-6 min-w-0">
        {active ? (
          <article className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/15 p-5">
            <header className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div className="min-w-0">
                <StatusBadge level="warning" pill icon="⏱️">
                  En cours
                </StatusBadge>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {active.title}
                </h3>
                {active.description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                    {active.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Du {active.startDate.toLocaleDateString("fr-FR")} au{" "}
                  {active.endDate.toLocaleDateString("fr-FR")}
                </p>
              </div>
              <StopChallengeButton challengeId={active.id} />
            </header>

            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">
              Classement par service en temps réel
            </h4>
            {ranking.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic py-3">
                Personne n'a encore complété d'épisode pendant ce challenge.
              </p>
            ) : (
              <ol className="space-y-2 list-none">
                {ranking.map((r, i) => (
                  <li
                    key={r.service}
                    className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-lg p-3 border border-amber-100 dark:border-amber-900/30"
                  >
                    <span
                      className={`shrink-0 w-9 h-9 rounded-lg font-bold flex items-center justify-center text-sm
                      ${
                        i === 0
                          ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                          : i === 1
                            ? "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-200"
                            : i === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300"
                      }`}
                    >
                      {i === 0
                        ? "🥇"
                        : i === 1
                          ? "🥈"
                          : i === 2
                            ? "🥉"
                            : `${i + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {r.service}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {r.participants} participant
                        {r.participants > 1 ? "s" : ""} · {r.episodes} épisode
                        {r.episodes > 1 ? "s" : ""} · {r.avgPerParticipant}{" "}
                        XP/personne moy.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-extrabold text-accent-500 tabular-nums">
                        {r.xp}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                        XP totaux
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </article>
        ) : (
          <AdminSection
            title="Lancer un nouveau challenge"
            description="Active un classement temporaire entre les services de ta PME."
          >
            <StartChallengeForm />
          </AdminSection>
        )}

        {/* Pourquoi un challenge - variant highlight */}
        <article className="rounded-xl border border-primary-500/20 bg-primary-50/40 dark:bg-blue-900/10 p-5">
          <h3 className="font-bold text-primary-600 dark:text-accent-300 mb-3 flex items-center gap-2">
            <span aria-hidden="true">💡</span>
            Pourquoi un challenge ?
          </h3>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>Crée un événement marquant qui pousse à l'action.</li>
            <li>Génère 3-5x plus d'engagement qu'une période classique.</li>
            <li>Le classement par service évite l'humiliation individuelle.</li>
            <li>Idéal pendant le Cybermois (octobre) ou avant un audit.</li>
          </ul>
        </article>

        {pastChallenges.length > 0 && (
          <AdminSection
            title="Historique"
            description={`${pastChallenges.length} challenge${pastChallenges.length > 1 ? "s" : ""} terminé${pastChallenges.length > 1 ? "s" : ""}`}
          >
            <ul className="space-y-2 list-none">
              {pastChallenges.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {c.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Du {c.startDate.toLocaleDateString("fr-FR")} au{" "}
                      {c.endDate.toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <StatusBadge level="neutral" pill>
                    Terminé
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </AdminSection>
        )}
      </div>
    </>
  );
}
