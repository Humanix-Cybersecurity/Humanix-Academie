// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page d'une saison : liste les episodes avec la progression de l'user.
// Atterrissage par defaut quand on clique le bandeau /apprendre/<slug>
// ou un lien marketing direct (CyberEventBanner, partage social...).
//
// SECU :
//   - Auth requise (sinon redirect /connexion)
//   - Saison invisible / non publiee / d'un autre tenant -> notFound()
//   - On expose uniquement les episodes publies

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth, getSignInPath } from "@/lib/auth";
import { db } from "@/lib/db";
import HexBackdrop from "@/components/HexBackdrop";

export const dynamic = "force-dynamic";

type Params = { saison: string };

export default async function SaisonPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { saison: saisonSlug } = await params;
  const session = await auth();
  if (!session?.user) redirect(getSignInPath());

  const userId = session.user!.id as string;
  const tenantId = session.user!.tenantId as string;

  // Saison globale (tenantId=null) ou saison custom du tenant courant.
  const saison = await db.saison.findFirst({
    where: {
      slug: saisonSlug,
      isPublished: true,
      OR: [{ tenantId: null }, { tenantId }],
    },
    include: {
      episodes: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!saison) notFound();

  const progressList = await db.progress.findMany({
    where: {
      userId,
      episodeId: { in: saison.episodes.map((e) => e.id) },
    },
    select: { episodeId: true, status: true, score: true },
  });
  const progressByEp = new Map(progressList.map((p) => [p.episodeId, p]));

  const total = saison.episodes.length;
  const done = saison.episodes.filter(
    (e) => progressByEp.get(e.id)?.status === "COMPLETED",
  ).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  // Premier episode non termine -> CTA "Continuer".
  const next = saison.episodes.find(
    (e) => progressByEp.get(e.id)?.status !== "COMPLETED",
  );

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-3xl mx-auto px-4 pt-10 pb-6 sm:pt-14 sm:pb-8">
          <Link
            href="/apprendre"
            className="text-xs uppercase tracking-widest font-bold text-accent-500 hover:underline mb-3 inline-block"
          >
            ← Toutes les saisons
          </Link>
          <div className="flex items-start gap-4 sm:gap-6">
            <div
              className="text-6xl sm:text-7xl shrink-0"
              aria-hidden="true"
            >
              {saison.coverEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-2">
                {saison.title}
              </h1>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 leading-relaxed">
                {saison.description}
              </p>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
              <span>
                <strong>{done}</strong> / {total} episodes terminés
              </span>
              <span className="font-bold text-primary-500 dark:text-accent-300">
                {pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/60 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-500 to-cyan-500 transition-all"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>

          {next && (
            <Link
              href={`/apprendre/${saison.slug}/${next.slug}`}
              className="btn-primary mt-5 inline-flex items-center gap-2"
            >
              <span aria-hidden="true">▶</span>
              <span>
                {done === 0
                  ? "Commencer la saison"
                  : `Continuer : ${next.title}`}
              </span>
            </Link>
          )}
          {!next && total > 0 && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 px-4 py-2 text-sm font-bold">
              <span aria-hidden="true">🎉</span>
              <span>Saison terminée — bravo !</span>
            </p>
          )}
        </section>
      </HexBackdrop>

      {/* Liste des episodes */}
      <section className="max-w-3xl mx-auto px-4 pb-16 mt-6">
        <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
          Episodes
        </h2>
        {total === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700 p-6 text-center text-sm text-gray-600 dark:text-gray-300">
            Cette saison n&apos;a pas encore d&apos;episode publié.
          </div>
        ) : (
          <ul className="space-y-2">
            {saison.episodes.map((ep, idx) => {
              const prog = progressByEp.get(ep.id);
              const isDone = prog?.status === "COMPLETED";
              const isInProgress = prog?.status === "IN_PROGRESS";
              return (
                <li key={ep.id}>
                  <Link
                    href={`/apprendre/${saison.slug}/${ep.slug}`}
                    className={`group flex items-center gap-4 rounded-xl border-2 px-4 py-3 transition-all hover:shadow-md hover:-translate-y-px ${
                      isDone
                        ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-900/20"
                        : isInProgress
                          ? "border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-900/20"
                          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums bg-white dark:bg-slate-800 text-primary-500 dark:text-accent-300 border border-current/20"
                      aria-hidden="true"
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                        {ep.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {ep.durationMinutes} min · {ep.xpReward} XP ·{" "}
                        {ep.coinsReward} 🪙
                        {prog?.score != null && isDone && (
                          <span className="ml-2 font-semibold text-emerald-700 dark:text-emerald-300">
                            Score {prog.score}/100
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider shrink-0 ${
                        isDone
                          ? "text-emerald-700 dark:text-emerald-300"
                          : isInProgress
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {isDone ? "✓ Fini" : isInProgress ? "En cours" : "À faire"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
