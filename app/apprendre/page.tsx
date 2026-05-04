// Hub apprenant — vue Duolingo evolutive : mascotte, level, streak, daily goal
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import HexMascotEvolved, { LevelProgressBar } from "@/components/HexMascotEvolved";
import CoachCard from "@/components/CoachCard";
import { getLevel } from "@/lib/levels";
import { buildEquippedFromInventory } from "@/lib/shop";
import { getActiveChallenge } from "@/lib/challenge";
import { generateCoachAdvice } from "@/lib/coach";

export const dynamic = "force-dynamic";

export default async function ApprendrePage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const userId = session.user!.id as string;
  const tenantId = session.user!.tenantId as string;

  // Saisons publiees + config tenant + inventaire pour customisations Hex
  // Filtrage : saisons globales (tenantId null) + saisons custom du tenant
  const [allSaisons, tenantConfigs, progress, user, inventory] = await Promise.all([
    db.saison.findMany({
      where: {
        isPublished: true,
        OR: [{ tenantId: null }, { tenantId }],
      },
      orderBy: { order: "asc" },
      include: {
        episodes: { where: { isPublished: true }, orderBy: { order: "asc" } },
      },
    }),
    db.tenantSaisonConfig.findMany({ where: { tenantId } }),
    db.progress.findMany({
      where: { userId },
      select: { episodeId: true, status: true, score: true, completedAt: true },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: {
        coins: true,
        name: true,
        mascotSpecies: true,
        mascotEmojiCustom: true,
        mood: true,
        shareCount: true,
      },
    }),
    db.userInventory.findMany({
      where: { userId, isEquipped: true },
      include: { item: true },
    }),
  ]);

  const equipped = buildEquippedFromInventory(
    inventory.map((i) => ({ item: i.item, isEquipped: i.isEquipped })),
  );
  const activeChallenge = await getActiveChallenge(tenantId);
  const coachAdvice = await generateCoachAdvice(userId);

  const configBySaison = new Map(tenantConfigs.map((c) => [c.saisonId, c]));

  // Filtrage : seulement les saisons actives pour ce tenant (par defaut actif si pas de config)
  // + tri par customOrder si defini, sinon order par defaut
  const saisons = allSaisons
    .filter((s) => {
      const cfg = configBySaison.get(s.id);
      return cfg ? cfg.isActive : true;
    })
    .map((s) => {
      const cfg = configBySaison.get(s.id);
      return {
        ...s,
        isMandatory: cfg?.isMandatory ?? false,
        effectiveOrder: cfg?.customOrder ?? s.order,
      };
    })
    .sort((a, b) => a.effectiveOrder - b.effectiveOrder);

  const progressByEp = new Map(progress.map((p) => [p.episodeId, p]));
  const totalXP = progress.reduce((s, p) => s + (p.score || 0), 0);
  const completedCount = progress.filter((p) => p.status === "COMPLETED").length;
  const totalEpisodes = saisons.reduce((s, sa) => s + sa.episodes.length, 0);
  const currentLevel = getLevel(totalXP);

  // Streak
  const completedDates = progress
    .filter((p) => p.completedAt)
    .map((p) => p.completedAt!);
  const streak = computeStreak(completedDates);

  // Daily goal
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = progress.filter((p) => p.completedAt && new Date(p.completedAt) >= today).length;
  const dailyGoal = 1;
  const dailyPct = Math.min(100, (completedToday / dailyGoal) * 100);

  const greetings = ["Salut", "Bonjour", "Hey", "Coucou"];
  const greet = greetings[Math.floor(Math.random() * greetings.length)];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 animate-fadeIn">
      {/* Bandeau Challenge si actif */}
      {activeChallenge && (
        <Link
          href="/classement"
          className="block mb-6 rounded-2xl p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-lg hover:scale-[1.01] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl animate-bounce-slow">🏆</div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide font-bold opacity-90">
                Cyber-Challenge en cours !
              </p>
              <p className="text-lg font-extrabold">{activeChallenge.title}</p>
              <p className="text-sm opacity-90">
                Voir le classement par service →
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold">
                {Math.max(0, Math.ceil((activeChallenge.endDate.getTime() - Date.now()) / (24 * 3600 * 1000)))}j
              </p>
              <p className="text-[10px] uppercase opacity-80">restant</p>
            </div>
          </div>
        </Link>
      )}

      {/* Hero : Mascotte évolutive + niveau */}
      <div
        className={`card mb-8 bg-gradient-to-br ${currentLevel.bgGradient} border-2 ${currentLevel.ringColor.replace("ring-", "border-")}`}
      >
        <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="flex justify-center">
            <HexMascotEvolved
              xp={totalXP}
              size="xl"
              mood={(user?.mood ?? "neutral") as any}
              showLevel
              animated
              equipped={equipped}
              species={user?.mascotSpecies ?? "fox"}
              customEmoji={user?.mascotEmojiCustom}
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-500">
              {greet} {user?.name?.split(" ")[0] ?? "👋"} !
            </h1>
            <p className="text-gray-700 italic mb-4">"{currentLevel.description}"</p>
            <LevelProgressBar xp={totalXP} />
            <div className="grid grid-cols-4 gap-3 mt-4">
              <MiniStat emoji="⚡" value={totalXP.toString()} label="XP" />
              <MiniStat emoji="🪙" value={(user?.coins ?? 0).toString()} label="coins" />
              <MiniStat emoji="🔥" value={streak.toString()} label="streak" />
              <MiniStat emoji="✓" value={`${completedCount}/${totalEpisodes}`} label="épisodes" />
            </div>
          </div>
        </div>
      </div>

      {/* Coach Hex */}
      <div className="mb-6">
        <CoachCard advice={coachAdvice} xp={totalXP} species={user?.mascotSpecies ?? "fox"} />
      </div>

      {/* Daily goal */}
      <div className="card mb-8 bg-gradient-to-r from-primary-50 to-white border-accent-500/30">
        <div className="flex items-center gap-4">
          <div className="text-4xl animate-bounce-slow">🎯</div>
          <div className="flex-1">
            <p className="font-bold text-primary-500">Objectif du jour</p>
            <p className="text-sm text-gray-600">
              {completedToday}/{dailyGoal} épisode{dailyGoal > 1 ? "s" : ""}
              {completedToday >= dailyGoal && " — atteint ! 🎉"}
            </p>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-accent-500 transition-all" style={{ width: `${dailyPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Saisons */}
      {saisons.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-6xl mb-4">📚</p>
          <p className="text-gray-500 mb-2">Aucun module n'est actif pour ton entreprise.</p>
          <p className="text-sm text-gray-400">Demande à ton dirigeant de t'activer un module.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-primary-500">Mes saisons</h2>
            <Link href="/profil" className="text-sm text-accent-500 hover:text-accent-600 font-medium">
              Mon profil →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {saisons.map((s, idx) => {
              const total = s.episodes.length;
              const done = s.episodes.filter((e) => progressByEp.get(e.id)?.status === "COMPLETED").length;
              const pct = total === 0 ? 0 : Math.round((done / total) * 100);
              const firstUndone = s.episodes.find((e) => progressByEp.get(e.id)?.status !== "COMPLETED");
              const isLocked = total === 0;
              return (
                <div
                  key={s.id}
                  className={`card transition-all hover:scale-[1.02] hover:shadow-lg ${
                    isLocked ? "opacity-60" : ""
                  } ${s.isMandatory && pct < 100 ? "border-red-300" : ""}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-5xl">{isLocked ? "🔒" : s.coverEmoji}</div>
                    <div className="flex flex-col items-end gap-1">
                      {s.isMandatory && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          OBLIGATOIRE
                        </span>
                      )}
                      {!isLocked && pct === 100 && <span className="text-3xl">🏆</span>}
                      {!isLocked && pct > 0 && pct < 100 && (
                        <span className="text-xs font-bold text-accent-500 bg-primary-50 px-3 py-1 rounded-full">
                          {pct}%
                        </span>
                      )}
                    </div>
                  </div>
                  <h2 className="font-bold text-primary-500 text-lg mb-1">{s.title}</h2>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">{s.description}</p>
                  {!isLocked && (
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-gradient-to-r from-accent-500 to-primary-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {isLocked ? (
                    <p className="text-sm text-gray-400 italic">Bientôt disponible</p>
                  ) : firstUndone ? (
                    <Link href={`/apprendre/${s.slug}/${firstUndone.slug}`} className="btn-primary w-full">
                      {done === 0 ? "Commencer" : "Continuer"}
                    </Link>
                  ) : (
                    <p className="text-sm font-bold text-success flex items-center gap-2">
                      <span className="text-xl">✓</span> Saison terminée — bravo !
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    {total} épisode{total > 1 ? "s" : ""} · {total * 6} min
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Aperçu badges */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-primary-500 mb-4">🏆 Mes badges</h2>
        <div className="card bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <div className="flex flex-wrap gap-3">
            {completedCount >= 1 && <Badge emoji="🎯" label="Premier pas" />}
            {completedCount >= 3 && <Badge emoji="🚀" label="3 épisodes" />}
            {completedCount >= 5 && <Badge emoji="🌟" label="5 épisodes" />}
            {completedCount >= totalEpisodes && totalEpisodes > 0 && <Badge emoji="👑" label="Toutes saisons" />}
            {streak >= 3 && <Badge emoji="🔥" label="Streak 3 jours" />}
            {totalXP >= 100 && <Badge emoji="💯" label="100 XP" />}
            {totalXP >= 250 && <Badge emoji="💎" label="250 XP" />}
            {totalXP >= 500 && <Badge emoji="🏅" label="500 XP" />}
            {(user?.shareCount ?? 0) >= 1 && <Badge emoji="📤" label="Partageur" />}
            {(user?.shareCount ?? 0) >= 3 && <Badge emoji="🎖️" label="Ambassadeur" />}
            {(user?.shareCount ?? 0) >= 10 && <Badge emoji="🌟" label="Évangéliste cyber" />}
            {completedCount === 0 && (
              <p className="text-sm text-gray-500 italic">
                Termine ton premier épisode pour débloquer un badge !
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div className="bg-white/70 rounded-xl p-2 text-center">
      <p className="text-base">{emoji}</p>
      <p className="text-base sm:text-lg font-extrabold text-primary-500">{value}</p>
      <p className="text-[10px] uppercase text-gray-500">{label}</p>
    </div>
  );
}

function Badge({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3 border-2 border-amber-200 flex items-center gap-2 shadow-sm hover:scale-105 transition-transform">
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-medium text-primary-500">{label}</span>
    </div>
  );
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
