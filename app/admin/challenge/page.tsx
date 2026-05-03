// Admin > Challenge : lancer ou arreter un challenge equipe temporaire
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import { getActiveChallenge, getChallengeRanking } from "@/lib/challenge";
import StartChallengeForm from "@/components/StartChallengeForm";
import StopChallengeButton from "@/components/StopChallengeButton";
import PlanGate from "@/components/PlanGate";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function AdminChallengePage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") redirect("/apprendre");
  const tenantId = (session.user as any).tenantId as string;

  const plan = await getTenantPlan(tenantId);

  // Gate : Challenges = Pro+
  if (!planHasFeature(plan, "challenges")) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold text-primary-500">Console dirigeant</h1>
        <p className="text-gray-600 mb-6">Gestion fine de votre programme de sensibilisation cyber.</p>
        <AdminNav />
        <div className="mt-8">
          <PlanGate feature="challenges" currentPlan={plan} requiredPlan={FEATURE_MIN_PLAN.challenges} />
        </div>
      </div>
    );
  }

  const active = await getActiveChallenge(tenantId);
  const ranking = active ? await getChallengeRanking(tenantId, active.startDate, active.endDate) : [];
  const pastChallenges = await db.teamChallenge.findMany({
    where: { tenantId, isActive: false },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-primary-500">Console dirigeant</h1>
      <p className="text-gray-600 mb-6">Gestion fine de votre programme de sensibilisation cyber.</p>

      <AdminNav />

      <h2 className="text-2xl font-bold text-primary-500 mb-4">🏆 Cyber-Challenges</h2>

      {active ? (
        <div className="card mb-8 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <span className="inline-block bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full mb-2">
                EN COURS
              </span>
              <h3 className="text-2xl font-bold text-primary-500">{active.title}</h3>
              {active.description && (
                <p className="text-gray-600 mt-1">{active.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Du {active.startDate.toLocaleDateString("fr-FR")} au{" "}
                {active.endDate.toLocaleDateString("fr-FR")}
              </p>
            </div>
            <StopChallengeButton challengeId={active.id} />
          </div>

          <h4 className="font-bold text-primary-500 mb-3">Classement par service en temps réel</h4>
          {ranking.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Personne n'a encore complété d'épisode pendant ce challenge.</p>
          ) : (
            <div className="space-y-2">
              {ranking.map((r, i) => (
                <div key={r.service} className="flex items-center gap-3 bg-white rounded-xl p-3">
                  <span className="text-2xl font-bold w-10">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-primary-500">{r.service}</p>
                    <p className="text-xs text-gray-500">
                      {r.participants} participant{r.participants > 1 ? "s" : ""} · {r.episodes} épisode{r.episodes > 1 ? "s" : ""} ·{" "}
                      {r.avgPerParticipant} XP/personne en moyenne
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-accent-500">{r.xp}</p>
                    <p className="text-[10px] text-gray-500">XP TOTAUX</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card mb-8">
          <h3 className="font-bold text-primary-500 text-lg mb-2">Lancer un nouveau challenge</h3>
          <p className="text-sm text-gray-500 mb-4">
            Active un classement temporaire entre les services de ta PME. Tes équipes vont s'affronter (avec bienveillance !) sur les XP gagnés pendant la période.
          </p>
          <StartChallengeForm />
        </div>
      )}

      <div className="card bg-primary-50 border-primary-500/20 mb-6">
        <h3 className="font-bold text-primary-500 mb-2">💡 Pourquoi un challenge ?</h3>
        <ul className="text-sm text-gray-700 space-y-1.5 list-disc pl-5">
          <li>Crée un événement marquant qui pousse à l'action.</li>
          <li>Génère 3-5x plus d'engagement qu'une période classique.</li>
          <li>Le classement par service évite l'humiliation individuelle.</li>
          <li>Idéal pendant le Cybermois (octobre) ou avant un audit.</li>
        </ul>
      </div>

      {pastChallenges.length > 0 && (
        <>
          <h3 className="text-lg font-bold text-primary-500 mb-3">Historique</h3>
          <div className="space-y-2">
            {pastChallenges.map((c) => (
              <div key={c.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-gray-500">
                    Du {c.startDate.toLocaleDateString("fr-FR")} au {c.endDate.toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <span className="text-xs text-gray-400 italic">Terminé</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
