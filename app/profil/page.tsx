// SPDX-License-Identifier: AGPL-3.0-or-later
// Page profil utilisateur - refonte cosy mai 2026.
//
// Brief : "experience, terrain, sensibilisation reelle, pas celle generee
// par la peur - celle qui sent bon la maitrise et la confiance".
//
// La page profil est l'espace personnel de l'apprenant. Avant, les
// labels "A ameliorer" / "Refaire pour ameliorer" sonnaient comme des
// reproches. Cette refonte adoucit le ton tout en preservant la fonction
// utilitaire (rejouer les episodes pour monter en maitrise).
//
// Logique metier preservee : queries Prisma, computeRiskScore, streak,
// abonnement Cyber-Anecdote.
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, getSignInPath } from "@/lib/auth";
import { db } from "@/lib/db";
import HexBackdrop from "@/components/HexBackdrop";
import HexMascotEvolved, {
  LevelProgressBar,
} from "@/components/HexMascotEvolved";
import RiskScoreCard from "@/components/RiskScoreCard";
import AnecdoteSubscribeForm from "@/components/AnecdoteSubscribeForm";
import { getLevel } from "@/lib/levels";
import { buildEquippedFromInventory } from "@/lib/shop";
import { computeRiskScore } from "@/lib/risk-score";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user) redirect(getSignInPath());
  const userId = session.user!.id as string;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      progress: {
        include: { episode: true, saison: true },
        orderBy: { completedAt: "desc" },
      },
      inventory: {
        where: { isEquipped: true },
        include: { item: true },
      },
    },
  });
  if (!user) redirect(getSignInPath());

  const equipped = buildEquippedFromInventory(
    user.inventory.map((i) => ({ item: i.item, isEquipped: i.isEquipped })),
  );
  const risk = await computeRiskScore(userId);

  const totalXP = user.progress.reduce((s, p) => s + (p.score || 0), 0);
  const completedCount = user.progress.filter(
    (p) => p.status === "COMPLETED",
  ).length;
  const totalEpisodes = await db.episode.count({
    where: { isPublished: true },
  });
  const level = getLevel(totalXP);

  // Streak
  const completedDates = user.progress
    .filter((p) => p.completedAt)
    .map((p) => p.completedAt!);
  const streak = computeStreak(completedDates);

  // Etat d'abonnement a la newsletter Cyber-Anecdote du Lundi
  const anecdoteSub = await db.anecdoteSubscription.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { isActive: true },
  });
  const isSubscribed = !!anecdoteSub?.isActive;

  // Categorisation : pepites (>=70%) / a polir (<70%)
  const PERFECT_THRESHOLD = 70;
  const perfectEpisodes = user.progress.filter(
    (p) => p.status === "COMPLETED" && (p.score ?? 0) >= PERFECT_THRESHOLD,
  );
  const toImproveEpisodes = user.progress.filter(
    (p) => p.status === "COMPLETED" && (p.score ?? 0) < PERFECT_THRESHOLD,
  );

  // Top 3 meilleurs scores
  const topScores = [...perfectEpisodes]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);

  const firstName = user.name?.split(" ")[0] ?? user.email.split("@")[0];

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ============================================================
          1. HERO - espace personnel cosy
          ============================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12"
        >
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div>
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
                Mon espace
              </p>
              <h1
                id="hero-title"
                className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight"
              >
                Bonjour, {firstName}.
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 italic mt-2">
                Le bilan tranquille de ton voyage cyber.
              </p>
            </div>
            {user.progress.length > 0 && (
              <a
                href="/api/me/certificate"
                download
                className="btn-secondary text-sm py-3 px-5 whitespace-nowrap"
              >
                <span aria-hidden="true">🎓</span> Télécharger mon certificat
              </a>
            )}
          </div>

          {/* Hero card : Mascot + Niveau + XP, palette niveau adaptive */}
          <div
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${level.bgGradient} border-2 ${level.ringColor.replace("ring-", "border-")} p-6 sm:p-8 shadow-sm`}
          >
            <div className="grid sm:grid-cols-[auto_1fr] gap-8 items-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-float">
                  <HexMascotEvolved
                    xp={totalXP}
                    size="hero"
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    mood={(user.mood ?? "happy") as any}
                    showLevel
                    animated
                    equipped={equipped}
                    species={user.mascotSpecies}
                    customEmoji={user.mascotEmojiCustom}
                  />
                </div>
                <Link
                  href="/profil/mascotte"
                  className="text-xs text-accent-700 dark:text-accent-300 hover:text-accent-600 font-medium underline-offset-4 hover:underline"
                >
                  🎭 Changer de mascotte
                </Link>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs uppercase tracking-widest text-gray-600 dark:text-gray-400 font-bold">
                    {user.name ?? user.email.split("@")[0]}
                  </span>
                  {user.service && (
                    <span className="text-xs bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-full px-2.5 py-0.5 text-gray-700 dark:text-gray-200">
                      {user.service}
                    </span>
                  )}
                  <Link
                    href="/profil/infos"
                    className="text-xs text-accent-700 dark:text-accent-300 hover:text-accent-600 font-medium underline-offset-4 hover:underline"
                    title="Modifier mon nom et mon service"
                  >
                    ✎ Modifier
                  </Link>
                </div>
                <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
                  Niveau {level.id}
                </p>
                <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mb-2 leading-tight">
                  {level.name}
                </h2>
                <p className="text-gray-700 dark:text-gray-200 mb-4 italic">
                  « {level.description} »
                </p>
                <LevelProgressBar xp={totalXP} />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  <SoftStat
                    emoji="⚡"
                    value={totalXP.toString()}
                    label="XP gagnés"
                  />
                  <SoftStat
                    emoji="🪙"
                    value={user.coins.toString()}
                    label="Coins"
                  />
                  <SoftStat
                    emoji="🔥"
                    value={streak.toString()}
                    label={streak <= 1 ? "jour" : "jours"}
                  />
                  <SoftStat
                    emoji="✓"
                    value={`${completedCount}`}
                    label={`/ ${totalEpisodes}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </HexBackdrop>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        {/* ============================================================
            2. SCORE DE RISQUE CYBER
            ============================================================ */}
        <RiskScoreCard risk={risk} />

        {/* ============================================================
            3. NEWSLETTER OPT-IN - chaleureux, pas insistant
            ============================================================ */}
        {!isSubscribed && (
          <section
            aria-labelledby="profile-anecdote-title"
            className="rounded-3xl bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-amber-950/30 dark:via-slate-900 dark:to-yellow-950/20 border-2 border-amber-200 dark:border-amber-900/40 p-6 sm:p-8"
          >
            <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-center">
              <div className="text-5xl animate-float" aria-hidden="true">
                ☕
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] font-bold text-amber-700 dark:text-amber-300 mb-2">
                  Newsletter facultative
                </p>
                <h2
                  id="profile-anecdote-title"
                  className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-amber-200 mb-2"
                >
                  La Cyber-Anecdote du Lundi
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-4 leading-relaxed">
                  Chaque lundi avec ton café : 1 vraie histoire cyber + 1 leçon
                  + 1 mini-action. 5 minutes pour rester en alerte tranquille
                  toute la semaine.
                </p>
                <AnecdoteSubscribeForm
                  source="profile"
                  variant="inline"
                  defaultEmail={user.email}
                />
              </div>
            </div>
          </section>
        )}
        {isSubscribed && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic px-2 text-center">
            <span aria-hidden="true">☕</span> Tu reçois la Cyber-Anecdote du
            Lundi. Le lien de désinscription est dans chaque email.
          </p>
        )}

        {/* ============================================================
            4. POUR ALLER PLUS LOIN - episodes a polir
            ============================================================ */}
        {toImproveEpisodes.length > 0 && (
          <section aria-labelledby="improve-title">
            <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
                  Pour aller plus loin
                </p>
                <h2
                  id="improve-title"
                  className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300"
                >
                  À polir ({toImproveEpisodes.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-1">
                  Pas un échec - juste des épisodes où il y a encore du
                  terrain à gagner. À ton rythme.
                </p>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 italic tabular-nums">
                Score &lt; {PERFECT_THRESHOLD} %
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {toImproveEpisodes.map((p, i) => (
                <ImproveCard key={p.id} progress={p} delay={i * 60} />
              ))}
            </div>
          </section>
        )}

        {/* ============================================================
            5. TES PEPITES - top 3 reussites
            ============================================================ */}
        {topScores.length > 0 && (
          <section aria-labelledby="top-title">
            <div className="text-center mb-6 sm:text-left">
              <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
                Tes pépites
              </p>
              <h2
                id="top-title"
                className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300"
              >
                Tes meilleures réussites
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {topScores.map((p, i) => (
                <article
                  key={p.id}
                  className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20 border-2 border-emerald-200 dark:border-emerald-900/40 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 animate-slide-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span
                    className="absolute top-3 right-3 text-3xl"
                    aria-hidden="true"
                  >
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </span>
                  <p className="text-3xl mb-2" aria-hidden="true">
                    {p.saison.coverEmoji}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-1 italic">
                    {p.saison.title}
                  </p>
                  <p className="font-display font-extrabold text-primary-500 dark:text-accent-300 mb-3 leading-tight">
                    {p.episode.title}
                  </p>
                  <p className="font-display text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {p.score} XP
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================
            6. TOUS LES EPISODES - table complete
            ============================================================ */}
        <section aria-labelledby="all-title">
          <div className="text-center mb-6 sm:text-left">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
              Ton journal de bord
            </p>
            <h2
              id="all-title"
              className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300"
            >
              Tous tes épisodes ({completedCount})
            </h2>
          </div>

          {user.progress.length === 0 ? (
            <div className="card text-center py-16 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border-emerald-200 dark:border-emerald-900/40">
              <p
                className="text-6xl mb-4 inline-block animate-float"
                aria-hidden="true"
              >
                🌱
              </p>
              <h3 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-2">
                Ton voyage commence quand tu veux
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                Aucun épisode terminé pour le moment. Pas de pression - quand
                tu te sens prêt·e, c'est par ici.
              </p>
              <Link href="/apprendre" className="btn-primary">
                Commencer ma première saison <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Historique de votre progression pedagogique : episodes
                  completes, saison d'origine, score quiz, date d'achèvement
                </caption>
                <thead className="text-left text-gray-500 dark:text-gray-400 border-b-2 border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="pb-3 font-bold text-xs uppercase tracking-wider">
                      Épisode
                    </th>
                    <th className="pb-3 font-bold text-xs uppercase tracking-wider">
                      Saison
                    </th>
                    <th className="pb-3 font-bold text-xs uppercase tracking-wider">
                      Score
                    </th>
                    <th className="pb-3 font-bold text-xs uppercase tracking-wider">
                      Quand
                    </th>
                    <th className="pb-3 font-bold text-xs uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {user.progress.map((p) => {
                    const score = p.score ?? 0;
                    const perfect = score >= PERFECT_THRESHOLD;
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-gray-200 dark:border-slate-700 last:border-0 hover:bg-accent-50/30 dark:hover:bg-slate-800/50 transition"
                      >
                        <td className="py-3 font-medium text-gray-900 dark:text-gray-100">
                          {p.episode.title}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-300">
                          <span aria-hidden="true">{p.saison.coverEmoji}</span>{" "}
                          {p.saison.title}
                        </td>
                        <td className="py-3 tabular-nums">
                          <span
                            className={`font-bold ${perfect ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}
                          >
                            {score} XP
                          </span>
                          {perfect && (
                            <span
                              className="ml-1 text-xs text-emerald-600 dark:text-emerald-400"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-gray-500 dark:text-gray-400 text-xs italic">
                          {p.completedAt ? formatDate(p.completedAt) : "—"}
                        </td>
                        <td className="py-3">
                          <Link
                            href={`/apprendre/${p.saison.slug}/${p.episode.slug}`}
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition ${
                              perfect
                                ? "text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
                                : "text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                            }`}
                            title={
                              perfect
                                ? "Refaire l'episode (par exemple pour le montrer a un collegue)"
                                : `Ameliorer ton score actuel (${score} XP)`
                            }
                          >
                            {perfect ? (
                              <>
                                <span aria-hidden="true">↻</span> Refaire
                              </>
                            ) : (
                              <>
                                <span aria-hidden="true">↑</span> Améliorer
                              </>
                            )}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ============================================================
            7. RESPIRATION - citation finale signature
            ============================================================ */}
        <section className="text-center pt-4">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            «{" "}
            {streak >= 7
              ? "Une semaine de régularité, c'est plus précieux qu'un mois de sprint. Tu construis du réflexe."
              : completedCount >= 5
                ? "Tu as déjà un bagage solide. Continue d'aiguiser tes réflexes, sans pression."
                : "Chaque épisode ajoute une corde à ton arc. La maîtrise se construit doucement."}{" "}
            »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
          >
            - Hex veille
          </p>
        </section>
      </div>
    </main>
  );
}

// ===========================================================================
// SOUS-COMPOSANTS LOCAUX
// ===========================================================================

function SoftStat({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-white/50 dark:border-slate-700/50 p-3 text-center shadow-sm">
      <p className="text-base" aria-hidden="true">
        {emoji}
      </p>
      <p className="font-display text-lg sm:text-xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
}

function ImproveCard({
  progress,
  delay,
}: {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  progress: any;
  delay: number;
}) {
  const score = progress.score ?? 0;
  return (
    <Link
      href={`/apprendre/${progress.saison.slug}/${progress.episode.slug}`}
      className="block bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-amber-950/30 dark:via-slate-900 dark:to-yellow-950/20 border-2 border-amber-200 dark:border-amber-900/40 rounded-3xl p-5 hover:shadow-md hover:-translate-y-1 transition-all animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl" aria-hidden="true">
          {progress.saison.coverEmoji}
        </div>
        <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full font-bold tabular-nums">
          {score} XP
        </span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 italic">
        {progress.saison.title}
      </p>
      <h3 className="font-display font-extrabold text-primary-500 dark:text-accent-300 mb-3 leading-tight">
        {progress.episode.title}
      </h3>
      <div className="text-sm text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1 underline-offset-4 hover:underline">
        <span aria-hidden="true">↑</span> Améliorer mon score
      </div>
    </Link>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffH = (now.getTime() - new Date(date).getTime()) / 3600_000;
  if (diffH < 1) return "à l'instant";
  if (diffH < 24) return `il y a ${Math.round(diffH)} h`;
  const diffD = diffH / 24;
  if (diffD < 7) return `il y a ${Math.round(diffD)} j`;
  return new Date(date).toLocaleDateString("fr-FR");
}

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(
    dates.map((d) => {
      const dd = new Date(d);
      dd.setHours(0, 0, 0, 0);
      return dd.getTime();
    }),
  );
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = today.getTime();
  const ONE_DAY = 24 * 3600 * 1000;
  if (!days.has(cursor)) cursor -= ONE_DAY;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= ONE_DAY;
  }
  return streak;
}
