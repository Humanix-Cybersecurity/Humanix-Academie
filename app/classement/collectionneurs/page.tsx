// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /classement/collectionneurs
//
// Classement PERMANENT des collectionneurs de badges (#752), par opposition
// a /classement qui n'existe que pendant un challenge actif. Donne enfin un
// usage aux "points de gloire" (Achievement.points), jusque-la sommes
// uniquement pour soi sur /profil/badges.
//
// Auth : tout membre connecte du tenant. Perimetre strictement tenant.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, getSignInPath } from "@/lib/auth";
import {
  getCollectorsRanking,
  getCollectorPosition,
  COLLECTORS_LIMIT,
} from "@/lib/achievements/collectors";
import { ACHIEVEMENTS_CATALOG } from "@/lib/achievements/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collectionneurs de badges - Humanix Académie",
  robots: { index: false, follow: false },
};

export default async function CollectionneursPage() {
  const session = await auth();
  if (!session?.user) redirect(getSignInPath());
  const tenantId = session.user!.tenantId as string;
  const userId = session.user!.id as string;

  const [rows, myPosition] = await Promise.all([
    getCollectorsRanking(tenantId),
    getCollectorPosition(tenantId, userId),
  ]);

  const maxPoints = ACHIEVEMENTS_CATALOG.reduce((s, a) => s + a.points, 0);
  const inTop = rows.some((r) => r.userId === userId);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fadeIn">
      <header className="mb-8">
        <Link
          href="/profil/badges"
          className="text-sm text-accent-500 hover:text-accent-600 underline-offset-4 hover:underline mb-3 inline-block"
        >
          ← Ma collection de badges
        </Link>
        <div className="rounded-3xl border-2 border-violet-300 dark:border-violet-900/40 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-slate-900 dark:to-fuchsia-950/20 p-6 sm:p-8">
          <span className="inline-block bg-violet-500 text-white text-xs font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-full mb-2">
            🏅 Collection permanente
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight">
            Les collectionneurs
          </h1>
          <p className="text-gray-700 dark:text-gray-200 mt-2 leading-relaxed">
            Le classement des points de gloire, gagnés badge après badge.
            Contrairement au Cyber-Challenge, il ne se remet jamais à zéro :
            c&apos;est le cumul de tout ton parcours.
          </p>
        </div>
      </header>

      {/* Ma position, y compris hors du top affiché */}
      {myPosition && (
        <div className="rounded-2xl border-2 border-accent-300 dark:border-accent-900/50 bg-accent-50 dark:bg-accent-950/20 p-4 mb-6 flex items-center gap-4 flex-wrap">
          <span className="text-3xl" aria-hidden="true">
            {inTop ? "🎯" : "📈"}
          </span>
          <p className="text-sm text-gray-800 dark:text-gray-100 flex-1 min-w-[200px]">
            Tu es <strong>{myPosition.rank}e</strong> sur {myPosition.total}{" "}
            collectionneur{myPosition.total > 1 ? "s" : ""} de ton organisation,
            avec <strong>{myPosition.points}</strong> points de gloire sur{" "}
            {maxPoints} possibles.
          </p>
          <Link
            href="/profil/badges"
            className="text-sm font-semibold text-accent-600 dark:text-accent-300 underline-offset-4 hover:underline"
          >
            Voir ce qu&apos;il me reste →
          </Link>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-5xl mb-3" aria-hidden="true">
            🏅
          </p>
          <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
            Aucun badge débloqué pour l&apos;instant
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
            Le premier module terminé décroche déjà un badge. À toi de lancer la
            collection !
          </p>
          <Link href="/apprendre" className="btn-primary">
            Commencer un module
          </Link>
        </div>
      ) : (
        <ol className="space-y-2 list-none p-0">
          {rows.map((r) => {
            const isMe = r.userId === userId;
            return (
              <li
                key={r.userId}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
                  isMe
                    ? "border-accent-400 bg-accent-50/60 dark:bg-accent-950/30"
                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                }`}
              >
                <span
                  className="text-xl w-9 text-center shrink-0 tabular-nums"
                  aria-hidden="true"
                >
                  {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {r.name}
                    {isMe && (
                      <span className="text-accent-600 dark:text-accent-300 font-bold">
                        {" "}
                        · toi
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {r.badgeCount} badge{r.badgeCount > 1 ? "s" : ""}
                    {r.service ? ` · ${r.service}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-extrabold text-violet-600 dark:text-violet-300 tabular-nums">
                    {r.points}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    gloire
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-[11px] text-gray-500 italic text-center mt-6">
        Top {COLLECTORS_LIMIT} des membres actifs de ton organisation. Les
        points de gloire sont indépendants de l&apos;XP : ils récompensent la
        variété de la collection, pas le temps passé.
      </p>
    </div>
  );
}
