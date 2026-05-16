// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// Hub apprenant - refonte cosy mai 2026 + Sprint 4 (juin 2026).
//
// Refonte juin 2026 (Sprint 4 simplicite) : decoupage des 8 sections en
// widgets composables sous components/learner/. La page reste server
// component (queries Prisma + calculs) mais l'UI est externalisee.
//
// 8 sections narratives (preservees a l'identique) :
//   1. Bandeau challenge (s'il y en a un, ton chaleureux et non urgent)
//   2. Hero "Bonjour [prenom]" personnalise selon l'heure du jour
//   3. Coach Hex (composant existant)
//   4. Ton prochain pas - l'action recommandee mise en valeur
//   5. Defi tranquille du jour - pas de pression
//   6. Tes saisons - cards magazine avec gradients doux
//   7. Tes acquis - badges valorisants
//   8. Respiration - citation rassurante de fin
//
// Brief original conserve : "magie, audace, professionalisme, animation,
// accessibilite, cosy, charmant, impactant. L'utilisateur au coeur du
// voyage sans se rendre compte qu'il est la pour apprendre. Sensibilisation
// reelle, pas celle generee par la peur - celle qui sent bon la maitrise
// et la confiance."
//
// Logique metier (queries Prisma, calculs streak/level/progress) conservee
// a l'identique.
// =============================================================================

import { auth, getSignInPath } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import CoachCard from "@/components/CoachCard";
import CyberEventBanner from "@/components/CyberEventBanner";
import { getLevel } from "@/lib/levels";
import { buildEquippedFromInventory } from "@/lib/shop";
import { getActiveChallenge } from "@/lib/challenge";
import { generateCoachAdvice } from "@/lib/coach";
import { listExpertEpisodes } from "@/lib/content-availability";
import { getUserPersona } from "@/lib/ai/persona";
import {
  classifySaisonForUser,
  compareSaisonsForUser,
  type SaisonClassification,
} from "@/lib/personalize/learn-path";
import { computeStreak } from "@/lib/streak";

import ChallengeBanner from "@/components/learner/ChallengeBanner";
import LearnerHero from "@/components/learner/LearnerHero";
import NextStepCard from "@/components/learner/NextStepCard";
import DailyGoalCard from "@/components/learner/DailyGoalCard";
import SaisonCard from "@/components/learner/SaisonCard";
import AcquisSection from "@/components/learner/AcquisSection";
import LearnerEmptyState from "@/components/learner/LearnerEmptyState";
import CloseQuote from "@/components/learner/CloseQuote";
import { SAISON_PALETTES, CITATIONS } from "@/components/learner/palettes";
import {
  PREMIUM_SAISONS_PREVIEW,
  isDemoMode,
} from "@/lib/demo-mode/premium-previews";
import LockedPremiumCard, {
  PremiumPreviewIntro,
} from "@/components/demo/LockedPremiumCard";

export const dynamic = "force-dynamic";

export default async function ApprendrePage() {
  const session = await auth();
  if (!session?.user) redirect(getSignInPath());
  const userId = session.user!.id as string;
  const tenantId = session.user!.tenantId as string;

  // Saisons publiees + config tenant + inventaire pour customisations Hex
  // Filtrage : saisons globales (tenantId null) + saisons custom du tenant
  const [allSaisons, tenantConfigs, progress, user, inventory, userGroups] =
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
      // Groupes (metiers / departements) auxquels l'user appartient.
      // Sert pour l'highlight des episodes targetes (Episode.targetGroups).
      db.userGroup.findMany({
        where: { userId },
        select: { group: { select: { slug: true } } },
      }),
    ]);

  // Set des slugs de groupes de l'user pour test rapide d'intersection
  // avec Episode.targetGroups (CSV "compta,rh"). Empty set = user sans
  // groupe = aucun episode targete (fallback OK : tous les episodes
  // restent accessibles, juste pas de highlight).
  const userGroupSlugs = new Set(userGroups.map((ug) => ug.group.slug));

  const equipped = buildEquippedFromInventory(
    inventory.map((i) => ({ item: i.item, isEquipped: i.isEquipped })),
  );
  const activeChallenge = await getActiveChallenge(tenantId);
  const coachAdvice = await generateCoachAdvice(userId);

  // Persona pedagogique infere : sert a prioriser les saisons sur la page
  // (un developpeur voit "cyber-dev" en haut, un finance voit
  // "fraude-president" en haut, etc.).
  const persona = await getUserPersona(userId);

  const configBySaison = new Map(tenantConfigs.map((c) => [c.saisonId, c]));

  /**
   * Compare les target groups d'un episode (CSV "compta,rh") avec les
   * groupes de l'user. Si intersection non vide, l'episode est "targete"
   * pour ce metier et merite un highlight visuel. Si pas de target ou pas
   * de groupes user, episode generique (mais reste accessible).
   */
  const isTargetedForUser = (targetGroups: string | null): boolean => {
    if (!targetGroups || userGroupSlugs.size === 0) return false;
    const slugs = targetGroups
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return slugs.some((s) => userGroupSlugs.has(s));
  };

  // On calcule les agregats AVANT le tri pour pouvoir alimenter la
  // classification (qui depend du completedCount + avgQuizScorePct).
  const progressByEp = new Map(progress.map((p) => [p.episodeId, p]));
  const totalXP = progress.reduce((s, p) => s + (p.score || 0), 0);
  const completedCount = progress.filter(
    (p) => p.status === "COMPLETED",
  ).length;
  // Score quiz moyen sur les episodes completes (pour debloquer le niveau
  // "hard" quand maturite >= 70%). On utilise score (XP/totalXP% approche)
  // faute de bestQuizScorePct ici ; pour 99% des cas la correlation est
  // suffisante pour la classification.
  const completedProgress = progress.filter((p) => p.status === "COMPLETED");
  const avgQuizScorePct =
    completedProgress.length === 0
      ? 0
      : Math.min(
          100,
          completedProgress.reduce((s, p) => s + (p.score ?? 0), 0) /
            completedProgress.length,
        );

  const saisons = allSaisons
    .filter((s) => {
      const cfg = configBySaison.get(s.id);
      return cfg ? cfg.isActive : true;
    })
    .map((s) => {
      const cfg = configBySaison.get(s.id);
      const isMandatory = cfg?.isMandatory ?? false;
      const classification: SaisonClassification = classifySaisonForUser({
        saisonSlug: s.slug,
        isMandatory,
        persona,
        completedCount,
        avgQuizScorePct,
      });
      return {
        ...s,
        isMandatory,
        effectiveOrder: cfg?.customOrder ?? s.order,
        classification,
        // Annote chaque episode avec un flag "pour ton metier" pour que
        // l'UI puisse highlighter (badge / couleur). Le tri par ordre
        // canonique est preserve : on n'inverse pas l'ordre, on signale
        // juste visuellement.
        episodes: s.episodes.map((e) => ({
          ...e,
          targetedForUser: isTargetedForUser(e.targetGroups),
        })),
      };
    })
    // Tri en 3 buckets : mandatory > recommended (par persona-rank) >
    // explore (ordre canonique). Cf. lib/personalize/learn-path.ts
    .sort(compareSaisonsForUser);

  const totalEpisodes = saisons.reduce((s, sa) => s + sa.episodes.length, 0);
  const currentLevel = getLevel(totalXP);

  // Episodes avec contenu MDX redige (vs fallback generique). Sert a
  // afficher un compteur "Expert" subtil sur chaque saison.
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

  // Salutation contextuelle selon l'heure
  const hour = new Date().getHours();
  const greet =
    hour < 6
      ? "Bonne nuit"
      : hour < 12
        ? "Bonjour"
        : hour < 18
          ? "Bel après-midi"
          : "Bonsoir";
  const firstName = user?.name?.split(" ")[0] ?? "toi";

  // L'action recommandee : premiere saison non completee, premier episode
  // non termine. C'est ce qu'on met en valeur dans "Ton prochain pas".
  const recommendedSaison = saisons.find((s) =>
    s.episodes.some((e) => progressByEp.get(e.id)?.status !== "COMPLETED"),
  );
  const recommendedEpisode = recommendedSaison?.episodes.find(
    (e) => progressByEp.get(e.id)?.status !== "COMPLETED",
  );
  const recommendedIsResume =
    !!recommendedEpisode &&
    progressByEp.get(recommendedEpisode.id)?.status === "IN_PROGRESS";

  // Citation deterministe par jour pour eviter les sauts de placement
  // entre rafraichissements
  const citationIdx = today.getDate() % CITATIONS.length;
  const citation = CITATIONS[citationIdx];

  return (
    <main id="main-content" className="animate-fadeIn overflow-x-hidden">
      {/* Evenement cyber en cours (Cybermois, WPD, etc.) */}
      <CyberEventBanner />

      {/* Bandeau challenge - discret, ton chaleureux non-urgent */}
      {activeChallenge && (
        <ChallengeBanner
          title={activeChallenge.title}
          endDate={activeChallenge.endDate}
        />
      )}

      {/* Hero personnel : salutation + mascotte + niveau + stats */}
      <LearnerHero
        greet={greet}
        firstName={firstName}
        totalXP={totalXP}
        coins={user?.coins ?? 0}
        streak={streak}
        completedCount={completedCount}
        totalEpisodes={totalEpisodes}
        currentLevel={currentLevel}
        mood={user?.mood ?? undefined}
        mascotSpecies={user?.mascotSpecies ?? undefined}
        mascotEmojiCustom={user?.mascotEmojiCustom}
        equipped={equipped}
      />

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-8">
        {/* Coach Hex - guidage personnalise (composant existant) */}
        <CoachCard
          advice={coachAdvice}
          xp={totalXP}
          species={user?.mascotSpecies ?? "fox"}
        />

        {/* Ton prochain pas - l'action prioritaire en valeur */}
        {recommendedEpisode && recommendedSaison && (
          <NextStepCard
            saisonSlug={recommendedSaison.slug}
            saisonTitle={recommendedSaison.title}
            saisonEmoji={recommendedSaison.coverEmoji}
            episodeSlug={recommendedEpisode.slug}
            episodeTitle={recommendedEpisode.title}
            episodeMinutes={recommendedEpisode.durationMinutes ?? 6}
            isResume={recommendedIsResume}
          />
        )}

        {/* Defi tranquille du jour */}
        <DailyGoalCard completedToday={completedToday} dailyGoal={dailyGoal} />

        {/* Tes saisons - cards magazine */}
        {saisons.length === 0 ? (
          <LearnerEmptyState />
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
              <a
                href="/profil"
                className="text-sm text-accent-500 hover:text-accent-600 font-semibold underline-offset-4 hover:underline"
              >
                Mon profil →
              </a>
            </div>

            {/* En DEMO_MODE : bandeau introductif pour montrer ce que la
                formule Standard apporte (placé AVANT la grille pour que le
                visiteur comprenne immédiatement ce qu'il voit après). */}
            {isDemoMode() && (
              <div className="mb-6">
                <PremiumPreviewIntro
                  totalCount={PREMIUM_SAISONS_PREVIEW.length}
                  label="saisons premium à débloquer (≈178 modules)"
                />
              </div>
            )}

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
                const targetedCount = s.episodes.filter(
                  (e) => e.targetedForUser,
                ).length;
                // Duree moyenne par episode = vraie valeur, pas un hardcode.
                // On affichera "~X min par episode" pour preserver la
                // promesse "5 min par jour".
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
                    targetedCount={targetedCount}
                    classification={s.classification}
                  />
                );
              })}

              {/* En DEMO_MODE : les saisons premium suivent les saisons OSS
                  pour montrer la profondeur du catalogue commercial. */}
              {isDemoMode() &&
                PREMIUM_SAISONS_PREVIEW.filter(
                  (p) => !saisons.some((s) => s.slug === p.slug),
                ).map((p) => (
                  <LockedPremiumCard
                    key={`premium-${p.slug}`}
                    emoji={p.emoji}
                    title={p.title}
                    subtitle={`${p.episodes} épisodes · Audience : ${p.audience}`}
                  />
                ))}
            </div>
          </section>
        )}

        {/* Mode Enqueteur — invitation a la decouverte guidee.
            On le pose juste avant les acquis pour qu'il complète le
            parcours classique : "tu as fait X modules, maintenant
            joue à les reperer dans la vraie vie". */}
        <section className="max-w-5xl mx-auto px-4 mt-8">
          <a
            href="/apprendre/enquetes"
            className="block rounded-3xl border-2 border-accent-300 dark:border-accent-900/50 bg-gradient-to-br from-accent-50 via-white to-blue-50 dark:from-accent-950/30 dark:via-slate-900 dark:to-blue-950/30 p-6 sm:p-8 hover:shadow-xl hover:border-accent-500 transition-all group"
          >
            <div className="flex items-start gap-4 flex-wrap">
              <span className="text-5xl shrink-0" aria-hidden="true">
                🔍
              </span>
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs uppercase tracking-widest font-bold text-accent-600 dark:text-accent-300 mb-1">
                  Nouveau · Mode Enquêteur
                </p>
                <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-2 group-hover:text-accent-500 transition-colors">
                  Joue à repérer les pièges plutôt qu'à les apprendre.
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  On te montre un mail, un post LinkedIn ou une scène
                  de bureau — tu coches ce qui te paraît louche. Le
                  signal qu'on repère soi-même, on ne le retient pas
                  par cœur : on le voit venir.
                </p>
              </div>
              <span className="ml-auto text-2xl text-accent-500 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </a>
        </section>

        {/* Tes acquis - badges + phrase chaleureuse */}
        <AcquisSection
          completedCount={completedCount}
          totalEpisodes={totalEpisodes}
          streak={streak}
          totalXP={totalXP}
          shareCount={user?.shareCount ?? 0}
        />

        {/* Respiration - citation finale */}
        <CloseQuote citation={citation} />
      </div>
    </main>
  );
}
