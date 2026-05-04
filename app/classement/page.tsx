// SPDX-License-Identifier: AGPL-3.0-or-later
// Page classement public visible pendant un challenge actif
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  getActiveChallenge,
  getChallengeRanking,
  getChallengeIndividualRanking,
} from "@/lib/challenge";

export const dynamic = "force-dynamic";

export default async function ClassementPage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const tenantId = session.user!.tenantId as string;

  const active = await getActiveChallenge(tenantId);
  if (!active) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <p className="text-6xl mb-4">🏆</p>
        <h1 className="text-3xl font-extrabold text-primary-500 mb-2">
          Aucun challenge en cours
        </h1>
        <p className="text-gray-600 mb-6">
          Reviens quand ton dirigeant aura lancé un Cyber-Challenge !
        </p>
        <Link href="/apprendre" className="btn-primary">
          Retour à mes saisons
        </Link>
      </div>
    );
  }

  const [byService, top10] = await Promise.all([
    getChallengeRanking(tenantId, active.startDate, active.endDate),
    getChallengeIndividualRanking(tenantId, active.startDate, active.endDate),
  ]);

  const daysLeft = Math.max(
    0,
    Math.ceil((active.endDate.getTime() - Date.now()) / (24 * 3600 * 1000)),
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="card mb-8 bg-gradient-to-br from-amber-100 via-orange-100 to-red-100 border-2 border-amber-400">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-block bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full mb-2">
              CHALLENGE EN COURS
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500">
              {active.title}
            </h1>
            {active.description && (
              <p className="text-gray-700 mt-2">{active.description}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-5xl font-extrabold text-orange-600">
              {daysLeft}
            </p>
            <p className="text-xs uppercase text-gray-600">
              jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold text-primary-500 mb-4">
            🏛️ Classement par service
          </h2>
          {byService.length === 0 ? (
            <div className="card text-center py-8 text-gray-400 italic">
              Sois le premier à marquer des points !
            </div>
          ) : (
            <div className="space-y-3">
              {byService.map((r, i) => (
                <div key={r.service} className="card">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : ""}
                    </span>
                    <span className="font-bold text-primary-500 flex-1">
                      {i + 1}. {r.service}
                    </span>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-accent-500">
                        {r.xp}
                      </p>
                      <p className="text-[10px] text-gray-500">XP</p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 ml-12">
                    {r.participants} participant{r.participants > 1 ? "s" : ""}{" "}
                    · {r.episodes} épisode{r.episodes > 1 ? "s" : ""} ·{" "}
                    {r.avgPerParticipant} XP / personne
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-primary-500 mb-4">
            ⚡ Top 10 individuel
          </h2>
          {top10.length === 0 ? (
            <div className="card text-center py-8 text-gray-400 italic">
              Personne au tableau pour l'instant.
            </div>
          ) : (
            <div className="card">
              <ol className="space-y-2">
                {top10.map((u, i) => (
                  <li
                    key={u.userId}
                    className="flex items-center gap-3 py-2 border-b last:border-0"
                  >
                    <span className="text-xl w-8 text-center">
                      {i === 0
                        ? "🥇"
                        : i === 1
                          ? "🥈"
                          : i === 2
                            ? "🥉"
                            : `${i + 1}`}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-gray-500">
                        {u.service ?? "Sans service"}
                      </p>
                    </div>
                    <p className="font-bold text-accent-500">{u.xp} XP</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link href="/apprendre" className="btn-primary">
          🎯 Continuer mon parcours pour grimper →
        </Link>
      </div>
    </div>
  );
}
