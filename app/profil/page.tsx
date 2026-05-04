// Page profil utilisateur — vue de progression personnelle + relance des episodes a refaire
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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
  if (!session?.user) redirect("/demo");
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
  if (!user) redirect("/demo");

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

  // Categorisation : parfait (>=70%) / a ameliorer (<70%)
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 animate-fadeIn">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500 mb-1">
            Mon profil
          </h1>
          <p className="text-gray-600">
            Bilan de ta progression cyber. Rejoue les épisodes que tu peux
            améliorer.
          </p>
        </div>
        {user.progress.length > 0 && (
          <a
            href="/api/me/certificate"
            download
            className="btn-primary text-sm py-2 px-4 whitespace-nowrap"
          >
            🎓 Télécharger mon certificat
          </a>
        )}
      </div>

      {/* Hero card : Mascot + Niveau + XP */}
      <div
        className={`card mb-8 bg-gradient-to-br ${level.bgGradient} border-2 ${level.ringColor.replace("ring-", "border-")}`}
      >
        <div className="grid sm:grid-cols-[auto_1fr] gap-8 items-center">
          <div className="flex flex-col items-center gap-2">
            <HexMascotEvolved
              xp={totalXP}
              size="hero"
              mood={(user.mood ?? "neutral") as any}
              showLevel
              animated
              equipped={equipped}
              species={user.mascotSpecies}
              customEmoji={user.mascotEmojiCustom}
            />
            <Link
              href="/profil/mascotte"
              className="text-xs text-accent-500 hover:text-accent-600 font-medium underline"
            >
              🎭 Changer de mascotte
            </Link>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold uppercase tracking-wide text-gray-600">
                {user.name ?? user.email.split("@")[0]}
              </span>
              {user.service && (
                <span className="text-xs bg-white/80 rounded-full px-2 py-0.5 text-gray-700">
                  {user.service}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-primary-500 mb-1">
              Niveau {level.id} · {level.name}
            </h2>
            <p className="text-gray-700 mb-4 italic">"{level.description}"</p>
            <LevelProgressBar xp={totalXP} />

            {/* Stats inline */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              <MiniStat emoji="⚡" value={totalXP.toString()} label="XP" />
              <MiniStat
                emoji="🪙"
                value={user.coins.toString()}
                label="coins"
              />
              <MiniStat emoji="🔥" value={streak.toString()} label="streak" />
              <MiniStat
                emoji="✓"
                value={`${completedCount}/${totalEpisodes}`}
                label="épisodes"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Score de risque cyber */}
      <div className="mb-8">
        <RiskScoreCard risk={risk} />
      </div>

      {/* Cyber-Anecdote du Lundi : opt-in actif (RGPD) */}
      {!isSubscribed && (
        <section
          className="mb-8 rounded-2xl bg-gradient-to-br from-accent-50 to-primary-50 dark:from-slate-800 dark:to-slate-900 border border-accent-200 dark:border-slate-700 p-6"
          aria-labelledby="profile-anecdote-title"
        >
          <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-center">
            <div className="text-4xl" aria-hidden="true">
              📅
            </div>
            <div>
              <h2
                id="profile-anecdote-title"
                className="text-lg font-bold text-primary-500 dark:text-accent-300 mb-1"
              >
                Recevez la Cyber-Anecdote du Lundi
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">
                Chaque lundi : 1 vraie histoire cyber + 1 leçon + 1 mini-action.
                5 min de lecture pour rester en alerte toute la semaine.
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
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400 italic px-2">
          📅 Vous êtes abonné·e à la Cyber-Anecdote du Lundi. Le lien de
          désinscription est dans chaque email.
        </p>
      )}

      {/* Section "À améliorer" — la plus visible si applicable */}
      {toImproveEpisodes.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-primary-500">
              🎯 À améliorer ({toImproveEpisodes.length})
            </h2>
            <span className="text-sm text-gray-500">
              Score &lt; {PERFECT_THRESHOLD}%
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {toImproveEpisodes.map((p) => (
              <ImproveCard key={p.id} progress={p} />
            ))}
          </div>
        </section>
      )}

      {/* Top 3 réussites */}
      {topScores.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-primary-500 mb-4">
            🏆 Mes meilleures réussites
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {topScores.map((p, i) => (
              <div key={p.id} className="card relative overflow-hidden">
                <span className="absolute top-2 right-2 text-3xl">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                </span>
                <p className="text-3xl mb-1">{p.saison.coverEmoji}</p>
                <p className="text-xs text-gray-500 mb-1">{p.saison.title}</p>
                <p className="font-bold text-primary-500 mb-2">
                  {p.episode.title}
                </p>
                <p className="text-2xl font-extrabold text-success">
                  {p.score} XP
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tous les épisodes complétés */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-primary-500 mb-4">
          📚 Tous mes épisodes complétés ({completedCount})
        </h2>
        {user.progress.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-6xl mb-4">📖</p>
            <p className="text-gray-500 mb-4">
              Tu n'as encore complété aucun épisode.
            </p>
            <Link href="/apprendre" className="btn-primary">
              Commencer ma première saison →
            </Link>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="pb-3 font-medium">Épisode</th>
                  <th className="pb-3 font-medium">Saison</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Complété</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {user.progress.map((p) => {
                  const score = p.score ?? 0;
                  const perfect = score >= PERFECT_THRESHOLD;
                  return (
                    <tr
                      key={p.id}
                      className="border-b last:border-0 hover:bg-primary-50/50 transition"
                    >
                      <td className="py-3 font-medium">{p.episode.title}</td>
                      <td className="py-3 text-gray-600">
                        {p.saison.coverEmoji} {p.saison.title}
                      </td>
                      <td className="py-3">
                        <span
                          className={`font-bold ${perfect ? "text-success" : "text-amber-600"}`}
                        >
                          {score} XP
                        </span>
                        {perfect && <span className="ml-1 text-xs">✓</span>}
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {p.completedAt ? formatDate(p.completedAt) : "—"}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/apprendre/${p.saison.slug}/${p.episode.slug}`}
                          className={`text-xs font-bold ${perfect ? "text-gray-500 hover:text-primary-500" : "text-accent-500 hover:text-accent-600"}`}
                        >
                          {perfect ? "Rejouer" : "Refaire pour améliorer →"}
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
    </div>
  );
}

function ImproveCard({ progress }: { progress: any }) {
  const score = progress.score ?? 0;
  return (
    <Link
      href={`/apprendre/${progress.saison.slug}/${progress.episode.slug}`}
      className="card hover:scale-[1.02] hover:shadow-lg transition-all border-amber-200 bg-amber-50/50"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl">{progress.saison.coverEmoji}</div>
        <span className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded-full font-bold">
          {score} XP
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-1">{progress.saison.title}</p>
      <h3 className="font-bold text-primary-500 mb-3">
        {progress.episode.title}
      </h3>
      <div className="text-sm text-accent-500 font-bold flex items-center gap-1">
        Refaire pour améliorer →
      </div>
    </Link>
  );
}

function MiniStat({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-white/70 rounded-xl p-3 text-center">
      <p className="text-lg">{emoji}</p>
      <p className="text-lg font-extrabold text-primary-500">{value}</p>
      <p className="text-[10px] uppercase text-gray-500">{label}</p>
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffH = (now.getTime() - new Date(date).getTime()) / 3600_000;
  if (diffH < 1) return "à l'instant";
  if (diffH < 24) return `il y a ${Math.round(diffH)}h`;
  const diffD = diffH / 24;
  if (diffD < 7) return `il y a ${Math.round(diffD)}j`;
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
