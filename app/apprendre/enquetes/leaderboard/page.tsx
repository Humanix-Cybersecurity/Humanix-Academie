// SPDX-License-Identifier: AGPL-3.0-or-later
// Leaderboard du Mode Enqueteur — top 10 detectives du tenant sur 30j.
//
// SECURITE :
//   - Auth obligatoire
//   - Scope tenant (jamais cross-tenant)
//   - Pas d'exposition d'email complet (juste prenom + initiale nom)

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, getSignInPath } from "@/lib/auth";
import { getTenantLeaderboard } from "@/lib/investigations/stats";
import { DETECTIVE_RANK_LABELS } from "@/lib/investigations/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard Détectives — Mode Enquêteur | Humanix Académie",
  description:
    "Classement des meilleurs détectives cyber de ton équipe sur les 30 derniers jours.",
};

const RANK_EMOJI: Record<string, string> = {
  aspirant: "🔰",
  "detective-junior": "🔎",
  "detective-confirme": "🔍",
  "cyber-sherlock": "🕵️",
  "maitre-detective": "👑",
};

/**
 * Renvoie un nom anonymise raisonnable : "Sophie M." plutot que
 * "sophie.martin@acme.fr". On affiche le nom complet seulement
 * pour l'user courant.
 */
function displayName(
  name: string | null,
  email: string,
  isMe: boolean,
): string {
  if (isMe) return "Toi";
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }
    return parts[0];
  }
  // Fallback : premiere lettre + domaine masque
  const local = email.split("@")[0] ?? "";
  return local.length > 0 ? `${local[0].toUpperCase()}.` : "Anonyme";
}

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    const signIn = getSignInPath();
    redirect(`${signIn}?callbackUrl=/apprendre/enquetes/leaderboard`);
  }
  const tenantId = session.user.tenantId;
  if (!tenantId) {
    redirect("/apprendre/enquetes");
  }

  const top = await getTenantLeaderboard(tenantId, {
    sinceDays: 30,
    limit: 10,
  });

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <section className="max-w-3xl mx-auto px-4 pt-10 pb-6 sm:pt-14 text-center">
        <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
          🏆 Leaderboard 30 jours
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-3">
          Les meilleurs détectives.
        </h1>
        <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 max-w-xl mx-auto leading-relaxed">
          Classement basé sur le nombre d'enquêtes réussies (≥ 60 %)
          sur les 30 derniers jours. Tiebreaker : score moyen.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-6">
        {top.length === 0 ? (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-900/50 rounded-2xl p-8 text-center">
            <p className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-2">
              Aucune enquête complétée ce mois-ci.
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300 mb-4">
              Sois le premier détective de ton équipe à valider une
              enquête !
            </p>
            <Link href="/apprendre/enquetes" className="btn-primary">
              Voir les enquêtes →
            </Link>
          </div>
        ) : (
          <ol className="space-y-2">
            {top.map((row, idx) => {
              const isMe = row.userId === session.user.id;
              const podium = idx < 3;
              return (
                <li
                  key={row.userId}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${
                    isMe
                      ? "border-accent-500 bg-accent-50 dark:bg-accent-950/30"
                      : podium
                        ? "border-amber-300 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <span
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      idx === 0
                        ? "bg-amber-400 text-white"
                        : idx === 1
                          ? "bg-gray-300 text-gray-900"
                          : idx === 2
                            ? "bg-orange-400 text-white"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-bold ${
                        isMe
                          ? "text-accent-700 dark:text-accent-200"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {displayName(row.userName, row.userEmail, isMe)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {RANK_EMOJI[row.rank] ?? "🔍"}{" "}
                      {DETECTIVE_RANK_LABELS[row.rank]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-lg text-primary-500 dark:text-accent-300">
                      {row.investigationsPassed}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      enquêtes
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-sm text-gray-700 dark:text-gray-200">
                      {Math.round(row.avgScoreRatio * 100)}%
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      moyenne
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/apprendre/enquetes" className="btn-secondary">
            ← Retour aux enquêtes
          </Link>
        </div>
      </section>
    </main>
  );
}
