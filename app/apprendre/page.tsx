// SPDX-License-Identifier: AGPL-3.0-or-later
// Hub apprenant - refonte cosy mai 2026.
//
// Brief : "magie, audace, professionalisme, animation, accessibilite,
// cosy, charmant, impactant. L'utilisateur au coeur du voyage sans se
// rendre compte qu'il est la pour apprendre. Sensibilisation reelle, pas
// celle generee par la peur - celle qui sent bon la maitrise et la
// confiance."
//
// 8 sections narratives :
//   1. Bandeau challenge (s'il y en a un, ton chaleureux et non urgent)
//   2. Hero "Bonjour [prenom]" personnalise selon l'heure du jour
//   3. Coach Hex (existait deja, garde)
//   4. Ton prochain pas - l'action recommandee mise en valeur, cadeau
//   5. Defi tranquille du jour - pas de pression, juste de la progression
//   6. Tes saisons - cards magazine avec gradients doux par theme
//   7. Tes acquis - badges valorisants + phrase chaleureuse
//   8. Respiration - citation rassurante de fin
//
// Logique metier (queries Prisma, calculs streak/level/progress)
// **conservee a l'identique** par rapport a la version anterieure.
// Cette refonte est purement visuelle.

import Link from "next/link";
import { auth, getSignInPath } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import HexBackdrop from "@/components/HexBackdrop";
import HexMascotEvolved, {
  LevelProgressBar,
} from "@/components/HexMascotEvolved";
import CoachCard from "@/components/CoachCard";
import { getLevel } from "@/lib/levels";
import { buildEquippedFromInventory } from "@/lib/shop";
import { getActiveChallenge } from "@/lib/challenge";
import { generateCoachAdvice } from "@/lib/coach";
import { listExpertEpisodes } from "@/lib/content-availability";

export const dynamic = "force-dynamic";

// ===========================================================================
// PALETTE DES SAISONS - 6 ambiances douces cyclees par index
// ===========================================================================
// On evite tout rouge alarmiste / orange criard. Les saisons doivent
// donner envie d'y entrer, pas mettre en garde.
const SAISON_PALETTES: Array<{
  bg: string; // gradient de fond de la card
  ring: string; // border de la card (subtle)
  badge: string; // bg pour le badge progression %
}> = [
  {
    bg: "from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40",
    ring: "border-cyan-200 dark:border-cyan-900/40",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  },
  {
    bg: "from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40",
    ring: "border-emerald-200 dark:border-emerald-900/40",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  {
    bg: "from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40",
    ring: "border-amber-200 dark:border-amber-900/40",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  {
    bg: "from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/40",
    ring: "border-purple-200 dark:border-purple-900/40",
    badge:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  },
  {
    bg: "from-rose-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40",
    ring: "border-rose-200 dark:border-rose-900/40",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  },
  {
    bg: "from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40",
    ring: "border-indigo-200 dark:border-indigo-900/40",
    badge:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  },
];

// Citations chaleureuses - affichees en bas de page, alternance aleatoire
const CITATIONS = [
  "La maitrise cyber, ce n'est pas un sommet - c'est un chemin. Cinq minutes par semaine suffisent.",
  "Tu n'as pas a etre expert. Tu as juste a etre averti une seconde avant le clic.",
  "Le meilleur reflexe cyber, c'est de prendre 30 secondes avant d'agir. Tu en es deja capable.",
  "Apprendre la cyber, c'est apprendre a se faire confiance. Hex t'accompagne, pas le contraire.",
  "Chaque module fait baisser le risque pour toi, ton equipe, ta famille. Sans drame.",
];

// ===========================================================================
// PAGE
// ===========================================================================

export default async function ApprendrePage() {
  const session = await auth();
  if (!session?.user) redirect(getSignInPath());
  const userId = session.user!.id as string;
  const tenantId = session.user!.tenantId as string;

  // Saisons publiees + config tenant + inventaire pour customisations Hex
  // Filtrage : saisons globales (tenantId null) + saisons custom du tenant
  const [allSaisons, tenantConfigs, progress, user, inventory] =
    await Promise.all([
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
        select: {
          episodeId: true,
          status: true,
          score: true,
          completedAt: true,
        },
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
  const completedCount = progress.filter(
    (p) => p.status === "COMPLETED",
  ).length;
  const totalEpisodes = saisons.reduce((s, sa) => s + sa.episodes.length, 0);
  const currentLevel = getLevel(totalXP);

  // Episodes avec contenu MDX redige (vs fallback generique).
  // Sert a afficher un compteur "Expert" subtil sur chaque saison.
  const expertEpisodes = new Set(
    listExpertEpisodes().map((e) => `${e.saisonSlug}/${e.episodeSlug}`),
  );

  // Streak
  const completedDates = progress
    .filter((p) => p.completedAt)
    .map((p) => p.completedAt!);
  const streak = computeStreak(completedDates);

  // Daily goal
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = progress.filter(
    (p) => p.completedAt && new Date(p.completedAt) >= today,
  ).length;
  const dailyGoal = 1;
  const dailyPct = Math.min(100, (completedToday / dailyGoal) * 100);

  // Salutation contextuelle selon l'heure
  const hour = new Date().getHours();
  const greet =
    hour < 6
      ? "Bonne nuit"
      : hour < 12
        ? "Bonjour"
        : hour < 18
          ? "Bel apres-midi"
          : "Bonsoir";
  const firstName = user?.name?.split(" ")[0] ?? "toi";

  // L'action recommandee : premiere saison non completee, premier episode
  // non termine. C'est ce qu'on met en valeur dans "Ton prochain pas".
  const recommendedSaison = saisons.find((s) =>
    s.episodes.some(
      (e) => progressByEp.get(e.id)?.status !== "COMPLETED",
    ),
  );
  const recommendedEpisode = recommendedSaison?.episodes.find(
    (e) => progressByEp.get(e.id)?.status !== "COMPLETED",
  );
  const recommendedIsResume =
    recommendedEpisode &&
    progressByEp.get(recommendedEpisode.id)?.status === "IN_PROGRESS";

  // Citation aleatoire de fin de page (deterministe par jour pour eviter
  // des sauts de placement entre rafraichissements)
  const citationIdx = today.getDate() % CITATIONS.length;
  const citation = CITATIONS[citationIdx];

  return (
    <main id="main-content" className="animate-fadeIn overflow-x-hidden">
      {/* ============================================================
          1. CHALLENGE - bandeau discret, ton chaleureux non-urgent
          ============================================================ */}
      {activeChallenge && (
        <Link
          href="/classement"
          className="block mx-auto max-w-5xl mt-6 mb-2 px-4"
        >
          <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-amber-100 via-amber-50 to-yellow-50 dark:from-amber-900/30 dark:via-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center gap-4">
              <div className="text-3xl animate-bounce-slow" aria-hidden="true">
                🏆
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-200">
                  Challenge en cours · entre equipes
                </p>
                <p className="text-sm sm:text-base font-bold text-primary-500 dark:text-accent-300 truncate">
                  {activeChallenge.title}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-xl sm:text-2xl font-extrabold text-amber-700 dark:text-amber-200 tabular-nums">
                  J–
                  {Math.max(
                    0,
                    Math.ceil(
                      (activeChallenge.endDate.getTime() - Date.now()) /
                        (24 * 3600 * 1000),
                    ),
                  )}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-amber-700/70 dark:text-amber-200/70">
                  Voir →
                </p>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ============================================================
          2. HERO - voyage personnel
          Salutation chaleureuse, mascotte qui flotte, niveau valorise.
          ============================================================ */}
      <section
        aria-labelledby="hero-title"
        className="relative bg-humanix-soft"
      >
        <HexBackdrop intensity="soft">
          <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
            <div className="grid sm:grid-cols-[auto_1fr] gap-8 items-center">
              {/* Mascotte qui flotte */}
              <div className="flex justify-center sm:justify-start">
                <div className="animate-float">
                  <HexMascotEvolved
                    xp={totalXP}
                    size="xl"
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    mood={(user?.mood ?? "happy") as any}
                    showLevel
                    animated
                    equipped={equipped}
                    species={user?.mascotSpecies ?? "fox"}
                    customEmoji={user?.mascotEmojiCustom}
                  />
                </div>
              </div>

              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-accent-500 font-bold mb-2">
                  Niveau {currentLevel.id} · {currentLevel.name}
                </p>
                <h1
                  id="hero-title"
                  className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-3"
                >
                  {greet}, {firstName}.
                </h1>
                <p className="italic text-base sm:text-lg text-gray-700 dark:text-gray-200 mb-5">
                  « {currentLevel.description} »
                </p>
                <LevelProgressBar xp={totalXP} />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  <SoftStat
                    emoji="⚡"
                    value={totalXP.toString()}
                    label="XP gagnes"
                  />
                  <SoftStat
                    emoji="🪙"
                    value={(user?.coins ?? 0).toString()}
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
        </HexBackdrop>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-8">
        {/* ============================================================
            3. COACH HEX - guidage personnalise (existait deja)
            ============================================================ */}
        <CoachCard
          advice={coachAdvice}
          xp={totalXP}
          species={user?.mascotSpecies ?? "fox"}
        />

        {/* ============================================================
            4. TON PROCHAIN PAS - l'action prioritaire en valeur
            Card-hero gradient officiel + animate-glow + emoji float.
            ============================================================ */}
        {recommendedEpisode && recommendedSaison && (
          <section aria-labelledby="next-step-title">
            <div className="card-hero animate-glow relative overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute -top-12 -right-12 text-9xl opacity-15"
              >
                {recommendedSaison.coverEmoji}
              </div>
              <div className="relative">
                <p className="text-xs uppercase tracking-[0.25em] font-bold opacity-90 mb-2">
                  Ton prochain pas
                </p>
                <h2
                  id="next-step-title"
                  className="font-display text-2xl sm:text-3xl font-extrabold mb-2"
                >
                  {recommendedIsResume ? "Reprends" : "Demarre"} «{" "}
                  {recommendedEpisode.title} »
                </h2>
                <p className="opacity-90 mb-5">
                  Saison · {recommendedSaison.title} · environ{" "}
                  {recommendedEpisode.durationMinutes ?? 6} minutes. Aucune
                  pression - c'est juste un moment pour toi.
                </p>
                <Link
                  href={`/apprendre/${recommendedSaison.slug}/${recommendedEpisode.slug}`}
                  className="inline-flex items-center gap-2 bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl shadow-md hover:scale-105 transition-transform"
                >
                  {recommendedIsResume ? "Continuer" : "Y aller"}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================
            5. DEFI TRANQUILLE - daily goal sans drama
            ============================================================ */}
        <section aria-labelledby="daily-title">
          <div className="card bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-900/40">
            <div className="flex items-start gap-4">
              <div className="text-3xl animate-bounce-slow" aria-hidden="true">
                🌱
              </div>
              <div className="flex-1">
                <h2
                  id="daily-title"
                  className="font-display text-lg font-bold text-emerald-800 dark:text-emerald-200"
                >
                  {completedToday >= dailyGoal
                    ? "Ton defi du jour est valide"
                    : "Ton defi tranquille du jour"}
                </h2>
                <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80 mb-3">
                  {completedToday >= dailyGoal
                    ? "Tu as fait ton temps cyber aujourd'hui. La regularite vaut mille sprints."
                    : "Un episode aujourd'hui, c'est cinq minutes pour toi. Pas plus, pas moins."}
                </p>
                <div className="w-full h-2 bg-emerald-200/50 dark:bg-emerald-900/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                    style={{ width: `${dailyPct}%` }}
                  />
                </div>
                <p className="text-xs text-emerald-800/60 dark:text-emerald-200/60 mt-2 tabular-nums">
                  {completedToday} / {dailyGoal} ·{" "}
                  {completedToday >= dailyGoal && "objectif atteint"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            6. SAISONS - cards magazine, gradients doux par theme
            ============================================================ */}
        {saisons.length === 0 ? (
          <EmptyState />
        ) : (
          <section aria-labelledby="seasons-title">
            <div className="flex items-end justify-between gap-3 flex-wrap mb-6">
              <div>
                <h2
                  id="seasons-title"
                  className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300"
                >
                  Tes saisons
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-1">
                  Chaque saison est un theme. Va a ton rythme.
                </p>
              </div>
              <Link
                href="/profil"
                className="text-sm text-accent-500 hover:text-accent-600 font-semibold underline-offset-4 hover:underline"
              >
                Mon profil →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {saisons.map((s, idx) => {
                const palette = SAISON_PALETTES[idx % SAISON_PALETTES.length];
                const total = s.episodes.length;
                const done = s.episodes.filter(
                  (e) => progressByEp.get(e.id)?.status === "COMPLETED",
                ).length;
                const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                const firstUndone = s.episodes.find(
                  (e) => progressByEp.get(e.id)?.status !== "COMPLETED",
                );
                const isLocked = total === 0;
                const expertCount = s.episodes.filter((e) =>
                  expertEpisodes.has(`${s.slug}/${e.slug}`),
                ).length;
                // Duree moyenne par episode = vraie valeur, pas un hardcode.
                // On affichera ca en "~X min par episode" pour preserver la
                // promesse "5 min par jour" (vs un total qui affiche 36 min
                // et fait fuir les apprenants).
                const avgMinutes =
                  total === 0
                    ? 0
                    : Math.round(
                        s.episodes.reduce(
                          (acc, e) => acc + (e.durationMinutes ?? 6),
                          0,
                        ) / total,
                      );

                return (
                  <SaisonCard
                    key={s.id}
                    idx={idx}
                    saison={s}
                    palette={palette}
                    pct={pct}
                    done={done}
                    total={total}
                    isLocked={isLocked}
                    firstUndoneSlug={firstUndone?.slug ?? null}
                    expertCount={expertCount}
                    avgMinutes={avgMinutes}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* ============================================================
            7. TES ACQUIS - badges + phrase chaleureuse de valorisation
            ============================================================ */}
        <section aria-labelledby="acquis-title">
          <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2
                id="acquis-title"
                className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300"
              >
                Tes acquis
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-1">
                {streak >= 3
                  ? `Tu construis du reflexe depuis ${streak} jours. C'est ca, la maitrise.`
                  : completedCount >= 5
                    ? "Tu as deja un bagage solide. Continue d'aiguiser tes reflexes."
                    : "Chaque module ajoute une corde a ton arc. Sans drame."}
              </p>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-amber-50 via-white to-amber-50/50 dark:from-amber-950/20 dark:via-slate-900 dark:to-amber-950/10 border-amber-200 dark:border-amber-900/40">
            <div className="flex flex-wrap gap-3">
              {completedCount >= 1 && (
                <Acquis emoji="🎯" label="Premier pas" />
              )}
              {completedCount >= 3 && <Acquis emoji="🚀" label="3 episodes" />}
              {completedCount >= 5 && <Acquis emoji="🌟" label="5 episodes" />}
              {completedCount >= totalEpisodes && totalEpisodes > 0 && (
                <Acquis emoji="👑" label="Toutes saisons" />
              )}
              {streak >= 3 && <Acquis emoji="🔥" label="3 jours d'affilee" />}
              {streak >= 7 && <Acquis emoji="🌊" label="Une semaine" />}
              {totalXP >= 100 && <Acquis emoji="💯" label="100 XP" />}
              {totalXP >= 250 && <Acquis emoji="💎" label="250 XP" />}
              {totalXP >= 500 && <Acquis emoji="🏅" label="500 XP" />}
              {(user?.shareCount ?? 0) >= 1 && (
                <Acquis emoji="📤" label="Partageur" />
              )}
              {(user?.shareCount ?? 0) >= 3 && (
                <Acquis emoji="🎖️" label="Ambassadeur" />
              )}
              {(user?.shareCount ?? 0) >= 10 && (
                <Acquis emoji="🌟" label="Evangeliste cyber" />
              )}
              {completedCount === 0 && (
                <p className="text-sm text-amber-900/70 dark:text-amber-100/70 italic">
                  Ton premier badge t'attend des le premier episode termine.
                  Pas de pression - quand tu te sens pret.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ============================================================
            8. RESPIRATION - citation de fin, signature confiante
            ============================================================ */}
        <section aria-hidden={false} className="text-center pt-6 pb-2">
          <blockquote className="font-display text-lg sm:text-xl italic text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « {citation} »
          </blockquote>
          <p
            className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
            aria-hidden="true"
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

function SaisonCard({
  idx,
  saison,
  palette,
  pct,
  done,
  total,
  isLocked,
  firstUndoneSlug,
  expertCount,
  avgMinutes,
}: {
  idx: number;
  saison: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    coverEmoji: string;
    isMandatory: boolean;
  };
  palette: (typeof SAISON_PALETTES)[number];
  pct: number;
  done: number;
  total: number;
  isLocked: boolean;
  firstUndoneSlug: string | null;
  expertCount: number;
  /** Duree moyenne reelle par episode, calculee depuis episodes.durationMinutes */
  avgMinutes: number;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-3xl border-2 ${palette.ring} bg-gradient-to-br ${palette.bg} p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-slide-up ${
        isLocked ? "opacity-60" : ""
      }`}
      style={{ animationDelay: `${idx * 60}ms` }}
    >
      {/* Emoji de cover en filigrane decoratif */}
      <span
        aria-hidden="true"
        className="absolute -top-2 -right-4 text-8xl opacity-10 select-none"
      >
        {saison.coverEmoji}
      </span>

      {/* Badge progression % en haut a droite */}
      {!isLocked && pct > 0 && pct < 100 && (
        <span
          className={`absolute top-4 right-4 ${palette.badge} text-xs font-bold px-3 py-1 rounded-full tabular-nums`}
        >
          {pct} %
        </span>
      )}
      {!isLocked && pct === 100 && (
        <span
          aria-label="Saison terminee"
          className="absolute top-4 right-4 text-3xl"
        >
          🏆
        </span>
      )}

      <div className="relative">
        {/* Cover emoji principal */}
        <div className="text-5xl mb-4" aria-hidden="true">
          {isLocked ? "🌒" : saison.coverEmoji}
        </div>

        {/* Recommande par ton equipe - badge soft amber, pas rouge */}
        {saison.isMandatory && pct < 100 && (
          <span className="inline-block mb-3 text-[10px] uppercase tracking-widest font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full">
            Recommande par ton equipe
          </span>
        )}

        <h3 className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-2 leading-tight">
          {saison.title}
        </h3>
        {saison.description && (
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-5 leading-relaxed">
            {saison.description}
          </p>
        )}

        {/* Barre de progression */}
        {!isLocked && (
          <div className="w-full h-2 bg-white/60 dark:bg-slate-800/60 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-gradient-to-r from-accent-500 to-primary-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* CTA */}
        {isLocked ? (
          <p className="text-sm italic text-gray-500 dark:text-gray-400">
            Bientot disponible
          </p>
        ) : firstUndoneSlug ? (
          <Link
            href={`/apprendre/${saison.slug}/${firstUndoneSlug}`}
            className="btn-primary w-full"
          >
            {done === 0 ? "Commencer" : "Continuer"}
          </Link>
        ) : (
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2">
            <span className="text-xl" aria-hidden="true">
              ✓
            </span>{" "}
            Saison terminee - bravo
          </p>
        )}

        {/* Meta info - naturelle, pas survendue.
            On affiche "~X min par episode" plutot que le total (qui ferait
            36 min et casserait la promesse "5 minutes par jour"). */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center tabular-nums">
          {total} episode{total > 1 ? "s" : ""} · ~{avgMinutes} min par
          episode
          {expertCount > 0 ? (
            <>
              {" "}
              ·{" "}
              <span
                className="text-accent-500 font-semibold"
                title="Episodes avec scenario detaille redige par un expert humain"
              >
                📝 {expertCount === total
                  ? "tous experts"
                  : `${expertCount} expert${expertCount > 1 ? "s" : ""}`}
              </span>
            </>
          ) : !isLocked ? (
            <>
              {" "}
              ·{" "}
              <span
                className="text-amber-600 dark:text-amber-400 font-semibold"
                title="Episodes en fallback structure (questions + quiz generiques). Enrichissement par expert prevu."
              >
                🔜 bientot enrichi
              </span>
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}

function Acquis({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 border-2 border-amber-200 dark:border-amber-900/50 flex items-center gap-2 shadow-sm hover:scale-105 hover:-translate-y-0.5 transition-all">
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="text-sm font-medium text-primary-500 dark:text-accent-300">
        {label}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="card text-center py-16 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border-emerald-200 dark:border-emerald-900/40">
      <p className="text-6xl mb-4 animate-float" aria-hidden="true">
        🌿
      </p>
      <h2 className="font-display text-xl font-bold text-primary-500 dark:text-accent-300 mb-2">
        Ton voyage commencera bientot
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">
        Aucune saison n'est encore active pour ton entreprise. Demande a ta
        direction d'activer un module - c'est rapide.
      </p>
    </section>
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
